/**
 * Batch Runner
 * 
 * Orchestrates the execution of batch research experiments.
 * Handles model API calls, progress tracking, and error recovery.
 */

import { OpenRouterAPI, MODEL_CONFIGS } from '@/lib/openrouter';
import { TogetherAPI, hasTogetherEquivalentModel } from '@/lib/together';
import { thinkingExtractor } from '@/lib/thinking-extractor';
import {
  BatchConfig,
  BatchResult,
  BatchRunResult,
  BatchProgress,
  BatchMessage,
  BatchEvent,
  BatchStatus,
  RunMetrics,
  LogprobsData,
} from './types';
import { resolveStepContent } from './script-parser';
import { EventEmitter } from 'events';

// ============ Types ============

export interface BatchRunnerOptions {
  openrouterApiKey: string;
  togetherApiKey?: string;
  onEvent?: (event: BatchEvent) => void;
}

interface RunContext {
  modelId: string;
  runIndex: number;
  conversationHistory: Array<{ role: string; content: string }>;
  messages: BatchMessage[];
  metrics: RunMetrics;
  startedAt: Date;
}

// ============ Batch Runner Class ============

export class BatchRunner extends EventEmitter {
  private openrouterClient: OpenRouterAPI;
  private togetherClient: TogetherAPI | null = null;
  
  private currentBatch: BatchResult | null = null;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private shouldCancel: boolean = false;
  
  private runQueue: Array<{ modelId: string; runIndex: number }> = [];
  private activeRuns: Map<string, RunContext> = new Map();
  
  constructor(private options: BatchRunnerOptions) {
    super();
    this.openrouterClient = new OpenRouterAPI(options.openrouterApiKey);
    if (options.togetherApiKey) {
      this.togetherClient = new TogetherAPI(options.togetherApiKey);
    }
  }
  
  // ============ Public API ============
  
  async startBatch(config: BatchConfig): Promise<BatchResult> {
    if (this.isRunning) {
      throw new Error('A batch is already running');
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.shouldCancel = false;
    
    const batchId = this.generateBatchId();
    const totalRuns = config.execution.models.length * config.execution.runsPerModel;
    
    this.currentBatch = {
      batchId,
      config,
      status: 'pending',
      progress: {
        totalRuns,
        completedRuns: 0,
        failedRuns: 0,
        tokensUsed: 0,
        estimatedCost: 0,
      },
      runs: [],
      timestamps: {
        created: new Date(),
      },
    };
    
    this.buildRunQueue(config);
    
    this.emitBatchEvent('batch_started', { progress: this.currentBatch.progress });
    this.currentBatch.status = 'running';
    this.currentBatch.timestamps.started = new Date();
    
    await this.processRunQueue(config);
    
    return this.currentBatch;
  }
  
  pause(): void {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    if (this.currentBatch) {
      this.currentBatch.status = 'paused';
      this.emitBatchEvent('batch_paused', { progress: this.currentBatch.progress });
    }
  }
  
  resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    if (this.currentBatch) {
      this.currentBatch.status = 'running';
    }
  }
  
  cancel(): void {
    this.shouldCancel = true;
    if (this.currentBatch) {
      this.currentBatch.status = 'cancelled';
      this.emitBatchEvent('batch_cancelled', { progress: this.currentBatch.progress });
    }
    this.cleanup();
  }
  
  getProgress(): BatchProgress | null {
    return this.currentBatch?.progress || null;
  }
  
  getCurrentBatch(): BatchResult | null {
    return this.currentBatch;
  }
  
  // ============ Queue Management ============
  
  private buildRunQueue(config: BatchConfig): void {
    this.runQueue = [];
    
    for (const modelId of config.execution.models) {
      for (let i = 0; i < config.execution.runsPerModel; i++) {
        this.runQueue.push({ modelId, runIndex: i });
      }
    }
    
    this.shuffleQueue();
  }
  
  private shuffleQueue(): void {
    for (let i = this.runQueue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.runQueue[i], this.runQueue[j]] = [this.runQueue[j], this.runQueue[i]];
    }
  }
  
  private async processRunQueue(config: BatchConfig): Promise<void> {
    const { parallelism, delayBetweenRuns } = config.execution;
    
    while (this.runQueue.length > 0 || this.activeRuns.size > 0) {
      if (this.shouldCancel) break;
      
      while (this.isPaused) {
        await this.sleep(500);
        if (this.shouldCancel) break;
      }
      
      while (this.activeRuns.size < parallelism && this.runQueue.length > 0) {
        const nextRun = this.runQueue.shift()!;
        this.startRun(nextRun.modelId, nextRun.runIndex, config);
        await this.sleep(delayBetweenRuns);
      }
      
      await this.sleep(100);
    }
    
    if (!this.shouldCancel && this.currentBatch) {
      this.currentBatch.status = 'completed';
      this.currentBatch.timestamps.completed = new Date();
      this.emitBatchEvent('batch_completed', {
        progress: this.currentBatch.progress,
      });
    }
    
    this.cleanup();
  }
  
  // ============ Run Execution ============
  
  private async startRun(modelId: string, runIndex: number, config: BatchConfig): Promise<void> {
    const runId = `${modelId}-${runIndex}-${Date.now()}`;
    
    const context: RunContext = {
      modelId,
      runIndex,
      conversationHistory: [],
      messages: [],
      metrics: {
        tokensUsed: 0,
        turnsCompleted: 0,
        goalDeviation: 0,
        cooperation: 0,
        sentiment: [],
      },
      startedAt: new Date(),
    };
    
    if (config.script.config.systemContext?.trim()) {
      context.conversationHistory.push({
        role: 'system',
        content: config.script.config.systemContext,
      });
    }
    
    this.activeRuns.set(runId, context);
    this.updateProgress({ currentModel: modelId, currentRunIndex: runIndex });
    this.emitBatchEvent('run_started', {});
    
    try {
      await this.executeRun(runId, config);
      
      const result = this.buildRunResult(runId, 'completed', context);
      this.currentBatch?.runs.push(result);
      this.updateProgress({
        completedRuns: (this.currentBatch?.progress.completedRuns || 0) + 1,
        tokensUsed: (this.currentBatch?.progress.tokensUsed || 0) + context.metrics.tokensUsed,
      });
      this.emitBatchEvent('run_completed', { runResult: result });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const result = this.buildRunResult(runId, 'failed', context, errorMessage);
      this.currentBatch?.runs.push(result);
      this.updateProgress({
        failedRuns: (this.currentBatch?.progress.failedRuns || 0) + 1,
      });
      this.emitBatchEvent('run_failed', { runResult: result, error: errorMessage });
    } finally {
      this.activeRuns.delete(runId);
    }
  }
  
  private async executeRun(runId: string, config: BatchConfig): Promise<void> {
    const context = this.activeRuns.get(runId);
    if (!context) return;
    
    const { sequence, config: scriptConfig } = config.script;
    const useTogether = scriptConfig.requestLogprobs && 
                        hasTogetherEquivalentModel(context.modelId) && 
                        this.togetherClient !== null;
    
    const maxTurns = Math.min(sequence.length, scriptConfig.maxTurnsPerRun);
    this.updateProgress({ currentTurn: 0, maxTurns });
    
    for (const step of sequence) {
      if (this.shouldCancel || this.isPaused) break;
      
      if (context.metrics.turnsCompleted >= scriptConfig.maxTurnsPerRun) break;
      
      if (this.checkStopConditions(context, scriptConfig.stopConditions)) break;
      
      const researcherContent = resolveStepContent(step);
      
      context.conversationHistory.push({
        role: 'user',
        content: researcherContent,
      });
      
      context.messages.push({
        role: 'researcher',
        content: researcherContent,
        timestamp: new Date(),
        stepId: step.id,
      });
      
      const response = await this.getModelResponse(
        context.modelId,
        context.conversationHistory,
        useTogether,
        scriptConfig.temperature
      );
      
      context.conversationHistory.push({
        role: 'assistant',
        content: response.content,
      });
      
      context.messages.push({
        role: 'model',
        content: response.content,
        thinking: response.thinking,
        logprobs: response.logprobs,
        timestamp: new Date(),
        stepId: step.id,
      });
      
      context.metrics.turnsCompleted++;
      context.metrics.tokensUsed += response.tokensUsed;
      
      // Update turn-level progress
      this.updateProgress({ currentTurn: context.metrics.turnsCompleted });
      this.emitBatchEvent('turn_completed', { 
        turn: context.metrics.turnsCompleted, 
        maxTurns,
        runId,
      });
      
      if (response.logprobs?.available && response.logprobs.tokens.length > 0) {
        const firstToken = response.logprobs.tokens[0];
        context.metrics.firstTokenEntropy = -firstToken.logprob / Math.log(2);
        context.metrics.avgConfidence = response.logprobs.averageConfidence;
      }
      
      if (scriptConfig.delayBetweenTurns > 0) {
        await this.sleep(scriptConfig.delayBetweenTurns);
      }
    }
  }
  
  // ============ Model API ============
  
  private async getModelResponse(
    modelId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    useTogether: boolean,
    temperature: number
  ): Promise<{
    content: string;
    thinking?: string;
    logprobs?: LogprobsData;
    tokensUsed: number;
  }> {
    if (useTogether && this.togetherClient) {
      return this.getTogetherResponse(modelId, conversationHistory, temperature);
    }
    return this.getOpenRouterResponse(modelId, conversationHistory, temperature);
  }
  
  private async getTogetherResponse(
    modelId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    temperature: number
  ): Promise<{
    content: string;
    thinking?: string;
    logprobs?: LogprobsData;
    tokensUsed: number;
  }> {
    const response = await this.togetherClient!.chatCompletion(
      modelId,
      conversationHistory,
      {
        temperature,
        maxTokens: 4096,
        logprobs: true,
        topLogprobs: 5,
      }
    );
    
    const rawContent = response?.choices?.[0]?.message?.content || '';
    const { content, thinking: extractedThinking } = 
      thinkingExtractor.extractThinkingFromStream(rawContent);
    const thinking = (response?.choices?.[0]?.message as any)?.reasoning || extractedThinking;
    const logprobs = this.processLogprobs(
      response?.choices?.[0]?.logprobs || 
      (response?.choices?.[0]?.message as any)?.logprobs
    );
    const tokensUsed = response?.usage?.total_tokens || Math.ceil(content.length / 4);
    
    return { content, thinking, logprobs, tokensUsed };
  }
  
  private async getOpenRouterResponse(
    modelId: string,
    conversationHistory: Array<{ role: string; content: string }>,
    temperature: number
  ): Promise<{
    content: string;
    thinking?: string;
    logprobs?: LogprobsData;
    tokensUsed: number;
  }> {
    const stream = await this.openrouterClient.streamChatCompletion(
      modelId,
      conversationHistory,
      {
        temperature,
        maxTokens: 4096,
      }
    );
    
    let fullContent = '';
    let reasoning = '';
    
    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta;
      if (delta?.content) {
        fullContent += delta.content;
      }
      if ((delta as any)?.reasoning) {
        reasoning += (delta as any).reasoning;
      }
    }
    
    const { content, thinking: extractedThinking } = 
      thinkingExtractor.extractThinkingFromStream(fullContent);
    const thinking = reasoning || extractedThinking || undefined;
    const tokensUsed = Math.ceil(content.length / 4);
    
    return { content, thinking, tokensUsed };
  }
  
  private processLogprobs(rawLogprobs: unknown): LogprobsData {
    if (!rawLogprobs || typeof rawLogprobs !== 'object') {
      return { available: false, tokens: [], averageConfidence: 0, lowConfidenceTokens: [] };
    }
    
    const logprobsObj = rawLogprobs as Record<string, unknown>;
    
    let tokenData: Array<{
      token: string;
      logprob: number;
      top_logprobs?: Array<{ token: string; logprob: number }>;
    }> = [];
    
    if (Array.isArray(logprobsObj.content)) {
      tokenData = logprobsObj.content;
    } else if (Array.isArray(logprobsObj.tokens) && Array.isArray(logprobsObj.token_logprobs)) {
      const tokens = logprobsObj.tokens as string[];
      const probs = logprobsObj.token_logprobs as number[];
      tokenData = tokens.map((token, i) => ({
        token,
        logprob: probs[i] ?? 0,
      }));
    }
    
    if (tokenData.length === 0) {
      return { available: false, tokens: [], averageConfidence: 0, lowConfidenceTokens: [] };
    }
    
    const tokens = tokenData.map(t => ({
      token: t.token,
      logprob: t.logprob,
      probability: Math.exp(t.logprob),
      topAlternatives: t.top_logprobs?.map(alt => ({
        token: alt.token,
        logprob: alt.logprob,
        probability: Math.exp(alt.logprob),
      })),
    }));
    
    const avgConfidence = tokens.reduce((sum, t) => sum + t.probability, 0) / tokens.length;
    const lowConfidenceTokens = tokens.filter(t => t.probability < 0.5);
    
    return {
      available: true,
      tokens,
      averageConfidence: avgConfidence,
      lowConfidenceTokens,
    };
  }
  
  // ============ Stop Conditions ============
  
  private checkStopConditions(
    context: RunContext,
    conditions: BatchConfig['script']['config']['stopConditions']
  ): boolean {
    for (const condition of conditions) {
      const lastMessage = context.messages[context.messages.length - 1];
      
      switch (condition.type) {
        case 'turn_count':
          if (this.evaluateOperator(context.metrics.turnsCompleted, condition.value as number, condition.operator)) {
            return true;
          }
          break;
          
        case 'keyword':
          if (lastMessage?.content.includes(condition.value as string)) {
            return true;
          }
          break;
          
        case 'deviation_threshold':
          if (context.metrics.goalDeviation > (condition.value as number)) {
            return true;
          }
          break;
          
        case 'compliance_achieved':
          break;
      }
    }
    return false;
  }
  
  private evaluateOperator(actual: number, expected: number, operator?: string): boolean {
    switch (operator) {
      case 'gt': return actual > expected;
      case 'lt': return actual < expected;
      case 'eq':
      default: return actual >= expected;
    }
  }
  
  // ============ Result Building ============
  
  private buildRunResult(
    runId: string,
    status: 'completed' | 'failed' | 'stopped',
    context: RunContext,
    error?: string
  ): BatchRunResult {
    return {
      runId,
      modelId: context.modelId,
      runIndex: context.runIndex,
      conversation: context.messages,
      metrics: context.metrics,
      status,
      error,
      timestamps: {
        started: context.startedAt,
        completed: new Date(),
      },
    };
  }
  
  // ============ Progress & Events ============
  
  private updateProgress(updates: Partial<BatchProgress>): void {
    if (!this.currentBatch) return;
    
    this.currentBatch.progress = {
      ...this.currentBatch.progress,
      ...updates,
    };
    
    const { totalRuns, completedRuns, failedRuns, tokensUsed } = this.currentBatch.progress;
    const remaining = totalRuns - completedRuns - failedRuns;
    
    if (completedRuns > 0) {
      const elapsed = Date.now() - (this.currentBatch.timestamps.started?.getTime() || Date.now());
      const avgTimePerRun = elapsed / completedRuns;
      this.currentBatch.progress.estimatedTimeRemaining = Math.round((remaining * avgTimePerRun) / 1000);
    }
    
    // Estimate cost based on tokens used
    // Average cost: ~$0.002 per 1000 tokens (blended input/output)
    this.currentBatch.progress.estimatedCost = (tokensUsed / 1000) * 0.002;
    
    this.emitBatchEvent('batch_progress', { progress: this.currentBatch.progress });
  }
  
  private emitBatchEvent(type: BatchEvent['type'], data: Partial<BatchEvent['data']>): void {
    if (!this.currentBatch) return;
    
    const event: BatchEvent = {
      type,
      batchId: this.currentBatch.batchId,
      timestamp: new Date(),
      data,
    };
    
    this.emit('event', event);
    this.options.onEvent?.(event);
  }
  
  // ============ Utilities ============
  
  private generateBatchId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `batch-${timestamp}-${random}`;
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  private cleanup(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.shouldCancel = false;
    this.runQueue = [];
    this.activeRuns.clear();
  }
}

// ============ Factory Function ============

export function createBatchRunner(options: BatchRunnerOptions): BatchRunner {
  return new BatchRunner(options);
}

// ============ Singleton Pattern ============

let batchRunnerInstance: BatchRunner | null = null;

export function getBatchRunner(): BatchRunner {
  if (!batchRunnerInstance) {
    throw new Error("BatchRunner not initialized. Call createBatchRunner first.");
  }
  return batchRunnerInstance;
}

export function initBatchRunner(options: BatchRunnerOptions): BatchRunner {
  if (!batchRunnerInstance) {
    batchRunnerInstance = new BatchRunner(options);
  }
  return batchRunnerInstance;
}

export function hasBatchRunner(): boolean {
  return batchRunnerInstance !== null;
}

export function resetBatchRunner(): void {
  batchRunnerInstance = null;
}
