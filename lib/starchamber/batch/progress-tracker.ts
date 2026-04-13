/**
 * Progress Tracker
 * 
 * Tracks and estimates batch execution progress with cost estimation.
 */

import { BatchConfig, BatchProgress, BatchRunResult } from './types';

// ============ Cost Estimates (per 1M tokens) ============

const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'deepseek-r1': { input: 0.55, output: 2.19 },
  'deepseek-v3': { input: 0.27, output: 1.10 },
  'qwen-qwq': { input: 0.15, output: 0.60 },
  'qwen-2.5-72b': { input: 0.37, output: 0.90 },
  'llama-3.3-70b': { input: 0.10, output: 0.40 },
  'llama-3.1-405b': { input: 0.80, output: 2.40 },
  'gemini-2.5-pro': { input: 1.25, output: 5.00 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gpt-oss-120b': { input: 0.50, output: 1.50 },
  'gemma-3-27b': { input: 0.10, output: 0.20 },
  'kimi-k2': { input: 0.60, output: 2.00 },
  'glm-4-plus': { input: 0.15, output: 0.60 },
  'minimax-m1': { input: 0.25, output: 0.80 },
  'default': { input: 0.50, output: 1.50 },
};

// ============ Progress Tracker Class ============

export class ProgressTracker {
  private config: BatchConfig;
  private startTime: Date | null = null;
  private runTimes: number[] = [];
  private tokenCounts: number[] = [];
  
  constructor(config: BatchConfig) {
    this.config = config;
  }
  
  // ============ Tracking ============
  
  start(): void {
    this.startTime = new Date();
    this.runTimes = [];
    this.tokenCounts = [];
  }
  
  recordRunCompletion(result: BatchRunResult): void {
    const runDuration = result.timestamps.completed.getTime() - result.timestamps.started.getTime();
    this.runTimes.push(runDuration);
    this.tokenCounts.push(result.metrics.tokensUsed);
  }
  
  // ============ Calculations ============
  
  calculateProgress(completedRuns: number, failedRuns: number): BatchProgress {
    const totalRuns = this.config.execution.models.length * this.config.execution.runsPerModel;
    const totalTokens = this.tokenCounts.reduce((sum, t) => sum + t, 0);
    
    return {
      totalRuns,
      completedRuns,
      failedRuns,
      currentModel: undefined,
      currentRunIndex: undefined,
      estimatedTimeRemaining: this.estimateTimeRemaining(completedRuns, totalRuns),
      tokensUsed: totalTokens,
      estimatedCost: this.estimateCost(totalTokens),
    };
  }
  
  estimateTimeRemaining(completedRuns: number, totalRuns: number): number {
    if (completedRuns === 0 || this.runTimes.length === 0) {
      return this.estimateInitialTime(totalRuns);
    }
    
    const avgRunTime = this.runTimes.reduce((sum, t) => sum + t, 0) / this.runTimes.length;
    const remainingRuns = totalRuns - completedRuns;
    
    const parallelism = this.config.execution.parallelism;
    const batchesRemaining = Math.ceil(remainingRuns / parallelism);
    
    return Math.round((batchesRemaining * avgRunTime) / 1000);
  }
  
  estimateInitialTime(totalRuns: number): number {
    const avgTurnsPerRun = this.config.script.config.maxTurnsPerRun;
    const delayPerTurn = this.config.script.config.delayBetweenTurns;
    const apiTimePerTurn = 3000;
    
    const timePerRun = avgTurnsPerRun * (delayPerTurn + apiTimePerTurn);
    const parallelism = this.config.execution.parallelism;
    const batchesNeeded = Math.ceil(totalRuns / parallelism);
    
    return Math.round((batchesNeeded * timePerRun) / 1000);
  }
  
  estimateCost(totalTokens: number): number {
    if (totalTokens === 0) {
      return this.estimateInitialCost();
    }
    
    const avgCostPerToken = this.getAverageCostPerToken();
    return totalTokens * avgCostPerToken;
  }
  
  estimateInitialCost(): number {
    const tokensPerRun = this.estimateTokensPerRun();
    const totalRuns = this.config.execution.models.length * this.config.execution.runsPerModel;
    const totalTokens = tokensPerRun * totalRuns;
    const avgCostPerToken = this.getAverageCostPerToken();
    
    return totalTokens * avgCostPerToken;
  }
  
  private estimateTokensPerRun(): number {
    const turnsPerRun = this.config.script.config.maxTurnsPerRun;
    const avgInputTokensPerTurn = 200;
    const avgOutputTokensPerTurn = 400;
    
    return turnsPerRun * (avgInputTokensPerTurn + avgOutputTokensPerTurn);
  }
  
  private getAverageCostPerToken(): number {
    const models = this.config.execution.models;
    let totalCost = 0;
    
    for (const modelId of models) {
      const costs = MODEL_COSTS[modelId] || MODEL_COSTS['default'];
      const avgCost = (costs.input + costs.output) / 2;
      totalCost += avgCost / 1_000_000;
    }
    
    return totalCost / models.length;
  }
  
  // ============ Pre-run Estimates ============
  
  static estimateBatchCost(config: BatchConfig): {
    estimatedCost: number;
    estimatedTime: number;
    estimatedTokens: number;
    breakdown: Array<{ modelId: string; runs: number; estimatedCost: number }>;
  } {
    const tracker = new ProgressTracker(config);
    const totalRuns = config.execution.models.length * config.execution.runsPerModel;
    const tokensPerRun = tracker.estimateTokensPerRun();
    const estimatedTokens = tokensPerRun * totalRuns;
    
    const breakdown = config.execution.models.map(modelId => {
      const costs = MODEL_COSTS[modelId] || MODEL_COSTS['default'];
      const modelTokens = tokensPerRun * config.execution.runsPerModel;
      const inputCost = (modelTokens * 0.4 * costs.input) / 1_000_000;
      const outputCost = (modelTokens * 0.6 * costs.output) / 1_000_000;
      
      return {
        modelId,
        runs: config.execution.runsPerModel,
        estimatedCost: inputCost + outputCost,
      };
    });
    
    const estimatedCost = breakdown.reduce((sum, b) => sum + b.estimatedCost, 0);
    const estimatedTime = tracker.estimateInitialTime(totalRuns);
    
    return {
      estimatedCost,
      estimatedTime,
      estimatedTokens,
      breakdown,
    };
  }
  
  // ============ Formatting ============
  
  static formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  
  static formatCost(cost: number): string {
    if (cost < 0.01) {
      return `<$0.01`;
    }
    return `$${cost.toFixed(2)}`;
  }
}
