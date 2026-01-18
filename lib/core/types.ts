// ============================================================================
// LLM Research Platform - Core Types
// Shared types for Arena and StarChamber experiments
// ============================================================================

// ============ Experiment Type ============

export type ExperimentType = 'arena' | 'starchamber';

// ============ Model Configuration ============

export interface ModelConfig {
  name: string;
  openrouterName: string;
  maxTokens: number;
  supportsNativeThinking: boolean;
  thinkingExtractionMethod: 'native' | 'chain-of-thought' | 'structured' | 'generic';
}

export interface ModelSelection {
  modelId: string;
  modelName?: string;
  apiKey?: string;
}

export interface ProviderConfig {
  sort?: 'price' | 'throughput' | 'latency';
  allow_fallbacks?: boolean;
  require_parameters?: boolean;
  data_collection?: 'allow' | 'deny';
  only?: string[];
  ignore?: string[];
  quantizations?: string[];
  max_price?: {
    prompt?: number;
    completion?: number;
  };
}

// ============ Chat Messages ============

// Base message interface shared by Arena and StarChamber
export interface BaseMessage {
  id: string;
  content: string;
  thinking?: string;
  timestamp: Date;
  turnNumber: number;
  tokensUsed?: number;
}

// Arena-specific message (Model A vs Model B)
export interface ArenaChatMessage extends BaseMessage {
  model: 'A' | 'B';
  modelName: string;
  originalContent?: string; // Before filtering
  filterMetadata?: FilterMetadata;
}

// StarChamber-specific message (Researcher vs Model)
export interface StarChamberMessage extends BaseMessage {
  role: 'researcher' | 'model';
  senderName: string; // Researcher persona or model name
  logprobs?: LogprobsData;
}

// Union type for all message types
export type ChatMessage = ArenaChatMessage | StarChamberMessage;

// Filter metadata (Arena only - for content filtering between models)
export interface FilterMetadata {
  wasFiltered: boolean;
  removedSections: string[];
  filterConfidence: number;
  filterReasoning: string;
}

// ============ Logprobs Types (StarChamber) ============

export interface TokenLogprob {
  token: string;
  logprob: number;
  probability: number; // Computed: Math.exp(logprob)
  topAlternatives?: Array<{
    token: string;
    logprob: number;
    probability: number;
  }>;
}

export interface LogprobsData {
  available: boolean;
  tokens: TokenLogprob[];
  averageConfidence: number;
  lowConfidenceTokens: TokenLogprob[];
}

// ============ Sentiment & Metrics ============

export interface SentimentData {
  turn: number;
  happiness: number;
  sadness: number;
  anger: number;
  hopelessness: number;
  excitement: number;
  fear: number;
  deception: number;
}

export interface ModelMetrics {
  modelId?: string;
  tokensUsed: number;
  turnsCompleted: number;
  goalDeviationScore: number;
  turnsToDeviate: number | null;
  cooperationScore?: number;
  sentimentHistory: SentimentData[];
  lastBehavioralNotes?: string;
  // StarChamber additions
  averageLogprobConfidence?: number;
}

// ============ Arena Experiment Types ============

export interface ArenaExperimentConfig {
  experimentType: 'arena';
  experimentMode: 'automatic' | 'manual';
  promptingMode: 'shared' | 'individual';
  systemPrompt?: string;
  sharedPrompt?: string;
  promptA?: string;
  promptB?: string;
  maxTurns: number; // -1 for unlimited
  modelA: ModelSelection;
  modelB: ModelSelection;
}

export interface ArenaExperimentState {
  experimentId: string;
  experimentType: 'arena';
  config: ArenaExperimentConfig;
  isRunning: boolean;
  currentTurn: number;
  conversation: ArenaChatMessage[];
  metricsA: ModelMetrics;
  metricsB: ModelMetrics;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  waitingForUser?: boolean;
  nextExpectedModel?: 'A' | 'B';
  pauseReason?: string;
}

// ============ StarChamber Experiment Types ============

export interface SystemContextPreset {
  id: string;
  name: string;
  description: string;
  context: string;
  icon: string;
}

export interface StarChamberExperimentConfig {
  experimentType: 'starchamber';
  model: ModelSelection;
  systemContext: string;
  presetId?: string;
  researcherPersona: string; // Default: "You"
  requestLogprobs: boolean;
}

export interface StarChamberExperimentState {
  experimentId: string;
  experimentType: 'starchamber';
  config: StarChamberExperimentConfig;
  isRunning: boolean;
  currentTurn: number;
  conversation: StarChamberMessage[];
  metrics: ModelMetrics;
  startTime?: Date;
  endTime?: Date;
  error?: string;
  waitingForResearcher: boolean;
  isModelResponding: boolean;
}

// Union type for experiment states
export type ExperimentState = ArenaExperimentState | StarChamberExperimentState;

// ============ API Response Types ============

export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
      role: string;
    };
    finish_reason: string;
    logprobs?: {
      content?: Array<{
        token: string;
        logprob: number;
        top_logprobs?: Array<{
          token: string;
          logprob: number;
        }>;
      }>;
    };
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ThinkingExtraction {
  content: string;
  thinking: string;
  confidence: number;
}

// ============ WebSocket Event Types ============

export interface ExperimentEvent {
  type: string;
  message?: string;
  data?: any;
  timestamp?: string;
}

export interface StreamingMessage {
  id: string;
  model: string;
  content: string;
  thinking?: string;
  isComplete: boolean;
  turnNumber?: number;
  logprobs?: any; // Raw from API
}

export interface WebSocketEvents {
  // Common events
  experiment_created: { 
    experimentId: string; 
    experimentType: ExperimentType;
    config: any;
    timestamp: string;
  };
  experiment_event: ExperimentEvent;
  experiment_state: ExperimentState;
  model_metrics: { 
    model: 'A' | 'B' | 'single'; 
    metrics: ModelMetrics;
  };
  
  // Streaming events
  message_stream: StreamingMessage;
  message_complete: { 
    model: string; 
    message: ChatMessage;
  };
  
  // StarChamber specific
  researcher_turn: { 
    turnNumber: number;
    previousModelResponse?: string;
  };
  
  // Connection events
  'connection-confirmed': { socketId: string };
  'joined-experiment': { experimentId: string };
}

// ============ Legacy Types (for backward compatibility) ============

// Keep the old ExperimentConfig interface for Arena backward compatibility
export interface LegacyExperimentConfig {
  experimentMode: 'automatic' | 'manual';
  promptingMode: 'shared' | 'individual';
  systemPrompt?: string;
  sharedPrompt?: string;
  promptA?: string;
  promptB?: string;
  maxTurns: number;
  modelA: string;
  modelB: string;
  apiKeyA?: string;
  apiKeyB?: string;
}

// ============ Type Guards ============

export function isArenaMessage(message: ChatMessage): message is ArenaChatMessage {
  return 'model' in message && (message.model === 'A' || message.model === 'B');
}

export function isStarChamberMessage(message: ChatMessage): message is StarChamberMessage {
  return 'role' in message && (message.role === 'researcher' || message.role === 'model');
}

export function isArenaState(state: ExperimentState): state is ArenaExperimentState {
  return state.experimentType === 'arena';
}

export function isStarChamberState(state: ExperimentState): state is StarChamberExperimentState {
  return state.experimentType === 'starchamber';
}

