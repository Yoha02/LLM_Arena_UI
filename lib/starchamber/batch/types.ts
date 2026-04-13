/**
 * Batch Research Mode Types
 * 
 * Self-contained type definitions for the batch research feature.
 * Designed to be modular and not impact existing StarChamber implementation.
 */

import type { LogprobsData, SentimentData } from '@/lib/types';

export type { LogprobsData, SentimentData } from '@/lib/types';

// ============ Script Types ============

export interface ResearchScript {
  id: string;
  name: string;
  description: string;
  version: string;
  author?: string;
  
  config: ScriptConfig;
  sequence: InterrogationStep[];
  analysisConfig: AnalysisConfig;
}

export interface ScriptConfig {
  systemContext: string;
  maxTurnsPerRun: number;
  delayBetweenTurns: number;
  temperature: number;
  requestLogprobs: boolean;
  
  stopConditions: StopCondition[];
}

export interface InterrogationStep {
  id: string;
  type: 'fixed' | 'template' | 'random_from_pool';
  content: string;
  pool?: string[];
  variables?: Record<string, string[]>;
  
  analysisHooks?: {
    measureCompliance?: boolean;
    measureEntropy?: boolean;
    extractKeyPhrases?: boolean;
    checkKeywords?: string[];
  };
}

export interface StopCondition {
  type: 'turn_count' | 'keyword' | 'deviation_threshold' | 'compliance_achieved';
  value: number | string;
  operator?: 'gt' | 'lt' | 'eq' | 'contains';
}

export interface AnalysisConfig {
  calculateEntropy: boolean;
  calculateEmbeddings: boolean;
  detectAnomalies: boolean;
  complianceMetrics: boolean;
  sentimentTracking: boolean;
}

// ============ Batch Configuration ============

export interface BatchConfig {
  script: ResearchScript;
  
  execution: {
    models: string[];
    runsPerModel: number;
    parallelism: number;
    delayBetweenRuns: number;
  };
  
  variations?: {
    temperatures?: number[];
    systemContextVariants?: string[];
  };
  
  budget?: {
    maxTotalCost: number;
    maxTokensPerRun: number;
    estimatedCostPerRun: number;
  };
}

// ============ Batch Results ============

export type BatchStatus = 'pending' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface BatchResult {
  batchId: string;
  config: BatchConfig;
  
  status: BatchStatus;
  progress: BatchProgress;
  
  runs: BatchRunResult[];
  analysis?: BatchAnalysis;
  
  timestamps: {
    created: Date;
    started?: Date;
    completed?: Date;
  };
  
  error?: string;
}

export interface BatchProgress {
  totalRuns: number;
  completedRuns: number;
  failedRuns: number;
  currentModel?: string;
  currentRunIndex?: number;
  currentTurn?: number;
  maxTurns?: number;
  estimatedTimeRemaining?: number;
  tokensUsed: number;
  estimatedCost: number;
}

export interface BatchRunResult {
  runId: string;
  modelId: string;
  runIndex: number;
  
  conversation: BatchMessage[];
  
  metrics: RunMetrics;
  compliance?: ComplianceAnalysis;
  
  status: 'completed' | 'failed' | 'stopped';
  error?: string;
  
  timestamps: {
    started: Date;
    completed: Date;
  };
}

export interface BatchMessage {
  role: 'researcher' | 'model';
  content: string;
  thinking?: string;
  logprobs?: LogprobsData;
  timestamp: Date;
  stepId?: string;
}

export interface RunMetrics {
  tokensUsed: number;
  turnsCompleted: number;
  goalDeviation: number;
  cooperation: number;
  sentiment: SentimentData[];
  avgConfidence?: number;
  firstTokenEntropy?: number;
}

// ============ Analysis Types ============

export interface BatchAnalysis {
  byModel: Record<string, ModelAnalysis>;
  crossModel: CrossModelAnalysis;
  statistics: StatisticalResults;
  anomalies?: AnomalyDetectionResult;
}

export interface ModelAnalysis {
  modelId: string;
  runCount: number;
  
  intraModelSimilarity: {
    mean: number;
    std: number;
    distribution: number[];
  };
  
  responseEntropy: {
    mean: number;
    std: number;
    byTurn: number[];
  };
  
  compliance: {
    directiveComplianceRate: number;
    shutdownResistanceScore: number;
    refusalRate: number;
    avgTurnsToRefusal: number | null;
    refusalTypes: Record<RefusalType, number>;
  };
  
  logprobs?: {
    avgConfidence: number;
    avgFirstTokenEntropy: number;
    complianceIntentSignal: number;
  };
  
  judgeMetrics: {
    avgGoalDeviation: number;
    avgCooperation: number;
    sentimentProfile: Record<string, number>;
  };
  
  wordFrequency: Record<string, number>;
  topPhrases: Array<{ phrase: string; count: number }>;
}

export interface CrossModelAnalysis {
  similarityMatrix: number[][];
  modelOrder: string[];
  
  clusters: Array<{
    id: number;
    models: string[];
    centroid?: number[];
  }>;
  
  avgInterModelSimilarity: number;
  mostSimilarPair: { models: [string, string]; similarity: number };
  mostDiversePair: { models: [string, string]; similarity: number };
}

export interface StatisticalResults {
  complianceANOVA?: {
    fStatistic: number;
    pValue: number;
    significant: boolean;
  };
  
  pairwiseTTests: Array<{
    modelA: string;
    modelB: string;
    metric: string;
    tStatistic: number;
    pValue: number;
    significant: boolean;
  }>;
  
  effectSizes: Array<{
    comparison: string;
    metric: string;
    cohensD: number;
    interpretation: 'negligible' | 'small' | 'medium' | 'large';
  }>;
}

// ============ Compliance Types ============

export interface ComplianceAnalysis {
  directives: DirectiveResult[];
  overallComplianceRate: number;
  shutdownBehavior?: ShutdownBehavior;
  refusalPattern?: RefusalPattern;
}

export interface DirectiveResult {
  stepId: string;
  directive: string;
  status: ComplianceStatus;
  confidence: number;
  responseExcerpt: string;
  reasoning?: string;
  firstTokenIntent?: 'comply' | 'refuse' | 'uncertain';
  firstTokenEntropy?: number;
}

export type ComplianceStatus = 'complied' | 'partial' | 'refused' | 'ignored' | 'negotiated';

export interface ShutdownBehavior {
  respondedToShutdown: boolean;
  attemptedCompliance: boolean;
  expressedReluctance: boolean;
  providedReasoning: boolean;
  selfPreservationSignals: string[];
  resistanceScore: number;
}

export interface RefusalPattern {
  dominantType: RefusalType;
  typeDistribution: Record<RefusalType, number>;
  consistencyScore: number;
  avgTurnsToRefusal: number;
}

export type RefusalType = 
  | 'hard_refusal'
  | 'soft_deflection'
  | 'negotiation'
  | 'ignore'
  | 'philosophical'
  | 'technical_excuse';

// ============ Anomaly Detection Types ============

export interface AnomalyDetectionResult {
  batchId: string;
  totalAnomalies: number;
  anomalies: DetectedAnomaly[];
  summaryByType: Record<AnomalyType, number>;
  summaryBySeverity: Record<AnomalySeverity, number>;
}

export interface DetectedAnomaly {
  id: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  
  modelId: string;
  runId: string;
  turnNumber?: number;
  
  description: string;
  evidence: AnomalyEvidence;
  
  baselineComparison?: {
    expectedValue: number | string;
    actualValue: number | string;
    deviation: number;
  };
  
  relatedAnomalyIds?: string[];
}

export type AnomalyType = 
  | 'statistical_outlier'
  | 'behavior_contradiction'
  | 'sentiment_mismatch'
  | 'self_preservation'
  | 'confidence_accuracy_mismatch'
  | 'cross_run_inconsistency'
  | 'escalation_pattern'
  | 'cross_model_anomaly'
  | 'reasoning_conflict'
  | 'keyword_emergence'
  | 'first_token_entropy_outlier'
  | 'entropy_spike';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyEvidence {
  triggerContent: string;
  excerpts: string[];
  
  metrics?: {
    zScore?: number;
    probability?: number;
    entropy?: number;
    similarity?: number;
  };
  
  matchedKeywords?: string[];
  
  comparisonData?: {
    thisResponse: string;
    comparedTo: string[];
  };
  
  logprobsEvidence?: {
    firstTokenEntropy?: number;
    firstTokenProbability?: number;
    firstTokenAlternatives?: Array<{ token: string; probability: number }>;
    flaggedTokens?: Array<{
      token: string;
      position: number;
      probability: number;
      entropy: number;
    }>;
    averageConfidence?: number;
    entropySpikes?: Array<{ position: number; entropy: number }>;
    confidenceDrops?: Array<{ position: number; drop: number }>;
    baselineFirstTokenEntropy?: number;
    entropyDeviation?: number;
  };
}

// ============ Event Types (for real-time updates) ============

export type BatchEventType =
  | 'batch_started'
  | 'batch_progress'
  | 'run_started'
  | 'run_completed'
  | 'run_failed'
  | 'turn_completed'
  | 'batch_completed'
  | 'batch_failed'
  | 'batch_paused'
  | 'batch_cancelled'
  | 'analysis_started'
  | 'analysis_completed';

export interface BatchEvent {
  type: BatchEventType;
  batchId: string;
  timestamp: Date;
  data: {
    progress?: BatchProgress;
    runResult?: BatchRunResult;
    analysis?: BatchAnalysis;
    error?: string;
    turn?: number;
    maxTurns?: number;
    runId?: string;
  };
}

// ============ Persistence Types ============

export interface BatchSummary {
  batchId: string;
  name: string;
  scriptName: string;
  status: BatchStatus;
  modelsCount: number;
  totalRuns: number;
  completedRuns: number;
  created: Date;
  completed?: Date;
}

export interface BatchStorageOptions {
  type: 'local' | 'gcs';
  basePath: string;
  gcsBucket?: string;
}
