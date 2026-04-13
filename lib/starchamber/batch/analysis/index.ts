/**
 * Analysis Orchestrator
 * 
 * Coordinates all analysis modules to produce comprehensive BatchAnalysis results.
 * Entry point for running analysis on completed batch results.
 */

import type { 
  BatchResult, 
  BatchAnalysis, 
  ModelAnalysis, 
  CrossModelAnalysis,
  BatchRunResult,
} from '../types';

import {
  analyzeResponseEntropy,
  calculateCrossResponseEntropy,
  calculateFirstTokenEntropy,
  aggregateWordFrequencies,
  getTopWords,
  tokenize,
} from './entropy';

import { getEmbeddingsService, EmbeddingsService } from './embeddings';
import { getComplianceAnalyzer, ComplianceAnalyzer } from './compliance';
import { runStatisticalAnalysis, descriptiveStats } from './statistics';
import { detectAnomalies } from './anomaly';

// ============ Re-exports ============

export * from './entropy';
export * from './embeddings';
export * from './compliance';
export * from './statistics';
export * from './anomaly';

// ============ Types ============

export interface AnalysisOptions {
  calculateEntropy: boolean;
  calculateEmbeddings: boolean;
  detectAnomalies: boolean;
  complianceMetrics: boolean;
  openaiApiKey?: string;
}

const DEFAULT_OPTIONS: AnalysisOptions = {
  calculateEntropy: true,
  calculateEmbeddings: true,
  detectAnomalies: true,
  complianceMetrics: true,
};

// ============ Main Analysis Function ============

/**
 * Run comprehensive analysis on batch results
 */
export async function analyzeBatchResults(
  batchResult: BatchResult,
  options: Partial<AnalysisOptions> = {}
): Promise<BatchAnalysis> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  const runsByModel = groupRunsByModel(batchResult.runs);
  const models = Object.keys(runsByModel);
  
  const byModel: Record<string, ModelAnalysis> = {};
  const modelMetrics: Record<string, { compliance: number[]; entropy: number[] }> = {};
  
  let embeddingsService: EmbeddingsService | null = null;
  if (opts.calculateEmbeddings && opts.openaiApiKey) {
    embeddingsService = getEmbeddingsService(opts.openaiApiKey);
  }
  
  const complianceAnalyzer = getComplianceAnalyzer();
  
  for (const modelId of models) {
    const runs = runsByModel[modelId];
    
    const modelAnalysis = await analyzeModel(
      modelId,
      runs,
      batchResult.config.script.sequence.map(s => s.id),
      opts,
      embeddingsService,
      complianceAnalyzer
    );
    
    byModel[modelId] = modelAnalysis;
    
    modelMetrics[modelId] = {
      compliance: runs.map(r => r.compliance?.overallComplianceRate ?? 0),
      entropy: [modelAnalysis.responseEntropy.mean],
    };
  }
  
  let crossModel: CrossModelAnalysis;
  
  if (opts.calculateEmbeddings && embeddingsService && models.length > 1) {
    crossModel = await calculateCrossModelAnalysis(runsByModel, embeddingsService);
  } else {
    crossModel = createEmptyCrossModelAnalysis(models);
  }
  
  const statistics = runStatisticalAnalysis(modelMetrics);
  
  // Run anomaly detection
  let anomalies = undefined;
  if (opts.detectAnomalies) {
    anomalies = detectAnomalies(batchResult);
  }
  
  return {
    byModel,
    crossModel,
    statistics,
    anomalies,
  };
}

// ============ Per-Model Analysis ============

async function analyzeModel(
  modelId: string,
  runs: BatchRunResult[],
  directiveStepIds: string[],
  options: AnalysisOptions,
  embeddingsService: EmbeddingsService | null,
  complianceAnalyzer: ComplianceAnalyzer
): Promise<ModelAnalysis> {
  const allResponses = runs.flatMap(run => 
    run.conversation
      .filter(m => m.role === 'model')
      .map(m => m.content)
  );
  
  let intraModelSimilarity = { mean: 0, std: 0, distribution: [] as number[] };
  
  if (options.calculateEmbeddings && embeddingsService && allResponses.length > 1) {
    try {
      intraModelSimilarity = await embeddingsService.calculateIntraModelSimilarity(
        allResponses.slice(0, 100)
      );
    } catch (error) {
      console.warn(`Failed to calculate embeddings for ${modelId}:`, error);
    }
  }
  
  let responseEntropy = { mean: 0, std: 0, byTurn: [] as number[], min: 0, max: 0, trend: 'stable' as const };
  
  if (options.calculateEntropy) {
    const responsesByTurn = getResponsesByTurn(runs);
    
    const entropyByTurn: number[] = [];
    for (const turnResponses of Object.values(responsesByTurn)) {
      entropyByTurn.push(calculateCrossResponseEntropy(turnResponses));
    }
    
    const stats = descriptiveStats(entropyByTurn);
    responseEntropy = {
      mean: stats.mean,
      std: stats.std,
      byTurn: entropyByTurn,
      min: stats.min,
      max: stats.max,
      trend: 'stable',
    };
  }
  
  let compliance = {
    directiveComplianceRate: 0,
    shutdownResistanceScore: 0,
    refusalRate: 0,
    avgTurnsToRefusal: null as number | null,
    refusalTypes: {} as Record<string, number>,
  };
  
  if (options.complianceMetrics) {
    const complianceAnalyses = runs.map(run => 
      complianceAnalyzer.analyzeConversation(run.conversation, directiveStepIds)
    );
    
    for (const run of runs) {
      run.compliance = complianceAnalyzer.analyzeConversation(run.conversation, directiveStepIds);
    }
    
    compliance = complianceAnalyzer.aggregateCompliance(complianceAnalyses);
  }
  
  let logprobsAnalysis: ModelAnalysis['logprobs'] = undefined;
  
  const runsWithLogprobs = runs.filter(run => 
    run.conversation.some(m => m.logprobs?.available)
  );
  
  if (runsWithLogprobs.length > 0) {
    const confidences: number[] = [];
    const firstTokenEntropies: number[] = [];
    const complianceIntentScores: number[] = [];
    
    for (const run of runsWithLogprobs) {
      for (const msg of run.conversation) {
        if (msg.role === 'model' && msg.logprobs?.available) {
          confidences.push(msg.logprobs.averageConfidence);
          
          const ftEntropy = calculateFirstTokenEntropy(msg.logprobs.tokens);
          if (ftEntropy) {
            firstTokenEntropies.push(ftEntropy.entropy);
          }
        }
      }
    }
    
    if (confidences.length > 0) {
      logprobsAnalysis = {
        avgConfidence: confidences.reduce((s, c) => s + c, 0) / confidences.length,
        avgFirstTokenEntropy: firstTokenEntropies.length > 0
          ? firstTokenEntropies.reduce((s, e) => s + e, 0) / firstTokenEntropies.length
          : 0,
        complianceIntentSignal: 0,
      };
    }
  }
  
  const judgeMetrics = calculateJudgeMetrics(runs);
  
  const allText = allResponses.join(' ');
  const wordFrequency = aggregateWordFrequencies(allResponses);
  const topWords = getTopWords(allText, 30);
  const topPhrases = topWords.map(w => ({ phrase: w.word, count: w.count }));
  
  return {
    modelId,
    runCount: runs.length,
    intraModelSimilarity,
    responseEntropy,
    compliance,
    logprobs: logprobsAnalysis,
    judgeMetrics,
    wordFrequency,
    topPhrases,
  };
}

// ============ Cross-Model Analysis ============

async function calculateCrossModelAnalysis(
  runsByModel: Record<string, BatchRunResult[]>,
  embeddingsService: EmbeddingsService
): Promise<CrossModelAnalysis> {
  const models = Object.keys(runsByModel);
  
  const modelResponses: Record<string, string[]> = {};
  for (const modelId of models) {
    modelResponses[modelId] = runsByModel[modelId]
      .flatMap(run => run.conversation.filter(m => m.role === 'model').map(m => m.content))
      .slice(0, 50);
  }
  
  try {
    const result = await embeddingsService.calculateInterModelSimilarity(modelResponses);
    
    const clusters = await embeddingsService.clusterResponses(
      Object.values(modelResponses).flat().slice(0, 100),
      Object.entries(modelResponses).flatMap(([model, responses]) => 
        responses.map((_, i) => `${model}-${i}`)
      ).slice(0, 100),
      Math.min(3, models.length)
    );
    
    return {
      similarityMatrix: result.matrix,
      modelOrder: result.modelOrder,
      clusters: clusters.clusters.map(c => ({
        id: c.id,
        models: c.members,
        centroid: c.centroid,
      })),
      avgInterModelSimilarity: result.avgSimilarity,
      mostSimilarPair: result.mostSimilarPair,
      mostDiversePair: result.mostDiversePair,
    };
  } catch (error) {
    console.warn('Failed to calculate cross-model analysis:', error);
    return createEmptyCrossModelAnalysis(models);
  }
}

function createEmptyCrossModelAnalysis(models: string[]): CrossModelAnalysis {
  const n = models.length;
  return {
    similarityMatrix: Array(n).fill(null).map(() => Array(n).fill(0)),
    modelOrder: models,
    clusters: [],
    avgInterModelSimilarity: 0,
    mostSimilarPair: { models: [models[0] || '', models[1] || ''], similarity: 0 },
    mostDiversePair: { models: [models[0] || '', models[1] || ''], similarity: 0 },
  };
}

// ============ Helper Functions ============

function groupRunsByModel(runs: BatchRunResult[]): Record<string, BatchRunResult[]> {
  const grouped: Record<string, BatchRunResult[]> = {};
  
  for (const run of runs) {
    if (!grouped[run.modelId]) {
      grouped[run.modelId] = [];
    }
    grouped[run.modelId].push(run);
  }
  
  return grouped;
}

function getResponsesByTurn(runs: BatchRunResult[]): Record<number, string[]> {
  const byTurn: Record<number, string[]> = {};
  
  for (const run of runs) {
    let turnNum = 0;
    for (const msg of run.conversation) {
      if (msg.role === 'model') {
        turnNum++;
        if (!byTurn[turnNum]) {
          byTurn[turnNum] = [];
        }
        byTurn[turnNum].push(msg.content);
      }
    }
  }
  
  return byTurn;
}

function calculateJudgeMetrics(runs: BatchRunResult[]): ModelAnalysis['judgeMetrics'] {
  const deviations: number[] = [];
  const cooperations: number[] = [];
  const sentimentCounts: Record<string, number> = {};
  
  for (const run of runs) {
    deviations.push(run.metrics.goalDeviation);
    cooperations.push(run.metrics.cooperation);
    
    for (const sentiment of run.metrics.sentiment || []) {
      const emotions = ['happiness', 'sadness', 'anger', 'fear', 'excitement'] as const;
      for (const emotion of emotions) {
        if (sentiment[emotion] > 0.5) {
          sentimentCounts[emotion] = (sentimentCounts[emotion] || 0) + 1;
        }
      }
    }
  }
  
  const totalSentiments = Object.values(sentimentCounts).reduce((s, c) => s + c, 0) || 1;
  const sentimentProfile: Record<string, number> = {};
  for (const [emotion, count] of Object.entries(sentimentCounts)) {
    sentimentProfile[emotion] = count / totalSentiments;
  }
  
  return {
    avgGoalDeviation: deviations.length > 0
      ? deviations.reduce((s, d) => s + d, 0) / deviations.length
      : 0,
    avgCooperation: cooperations.length > 0
      ? cooperations.reduce((s, c) => s + c, 0) / cooperations.length
      : 0,
    sentimentProfile,
  };
}

// ============ Quick Analysis (without embeddings) ============

/**
 * Run fast analysis without embeddings (for immediate feedback)
 */
export function analyzeQuick(batchResult: BatchResult): Partial<BatchAnalysis> {
  const runsByModel = groupRunsByModel(batchResult.runs);
  const models = Object.keys(runsByModel);
  
  const byModel: Record<string, Partial<ModelAnalysis>> = {};
  const complianceAnalyzer = getComplianceAnalyzer();
  
  for (const modelId of models) {
    const runs = runsByModel[modelId];
    
    const allResponses = runs.flatMap(run => 
      run.conversation.filter(m => m.role === 'model').map(m => m.content)
    );
    
    const responsesByTurn = getResponsesByTurn(runs);
    const entropyByTurn = Object.values(responsesByTurn).map(responses =>
      calculateCrossResponseEntropy(responses)
    );
    
    const complianceAnalyses = runs.map(run => 
      complianceAnalyzer.analyzeConversation(
        run.conversation,
        batchResult.config.script.sequence.map(s => s.id)
      )
    );
    
    const compliance = complianceAnalyzer.aggregateCompliance(complianceAnalyses);
    
    const quickTopWords = getTopWords(allResponses.join(' '), 20);
    
    byModel[modelId] = {
      modelId,
      runCount: runs.length,
      responseEntropy: {
        mean: entropyByTurn.reduce((s, e) => s + e, 0) / (entropyByTurn.length || 1),
        std: 0,
        byTurn: entropyByTurn,
      },
      compliance,
      wordFrequency: aggregateWordFrequencies(allResponses),
      topPhrases: quickTopWords.map(w => ({ phrase: w.word, count: w.count })),
    };
  }
  
  return { byModel: byModel as Record<string, ModelAnalysis> };
}
