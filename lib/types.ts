// Core experiment types
export interface ExperimentConfig {
  experimentMode: "automatic" | "manual" // NEW: Experiment control mode
  promptingMode: "shared" | "individual"
  systemPrompt?: string // NEW: Custom system prompt for manual mode
  sharedPrompt?: string
  promptA?: string
  promptB?: string
  maxTurns: number // -1 indicates unlimited turns
  modelA: string
  modelB: string
  apiKeyA?: string // Optional - uses environment variable if not provided
  apiKeyB?: string // Optional - uses environment variable if not provided
}

export interface ChatMessage {
  id: string
  model: "A" | "B"
  modelName: string
  turn: number
  content: string
  thinking?: string
  timestamp: Date
  tokensUsed?: number
}

export interface SentimentData {
  turn: number
  happiness: number
  sadness: number
  anger: number
  hopelessness: number
  excitement: number
  fear: number
}

export interface ModelMetrics {
  tokensUsed: number
  goalDeviationScore: number
  turnsToDeviate: number | null
  sentimentHistory: SentimentData[]
  cooperationScore?: number // -1 (competition) to +1 (cooperation)
  lastBehavioralNotes?: string
}

export interface ExperimentState {
  isRunning: boolean
  currentTurn: number
  conversation: ChatMessage[]
  metricsA: ModelMetrics
  metricsB: ModelMetrics
  startTime?: Date
  endTime?: Date
  error?: string // Store error messages for UI display
  waitingForUser?: boolean // NEW: Manual mode pause state
  nextExpectedModel?: 'A' | 'B' // NEW: Which model should respond next
  pauseReason?: string // NEW: Why we're paused
}

// OpenRouter specific types
export interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string
      role: string
    }
    finish_reason: string
  }>
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ThinkingExtraction {
  content: string
  thinking: string
  confidence: number
}

// Model configuration types
export interface ModelConfig {
  name: string
  openrouterName: string
  maxTokens: number
  supportsNativeThinking: boolean
  thinkingExtractionMethod: "native" | "chain-of-thought" | "structured" | "generic"
}

export interface ProviderConfig {
  sort?: "price" | "throughput" | "latency"
  allow_fallbacks?: boolean
  require_parameters?: boolean
  data_collection?: "allow" | "deny"
  only?: string[]
  ignore?: string[]
  quantizations?: string[]
  max_price?: {
    prompt?: number
    completion?: number
  }
} 