// ============================================================================
// StarChamber Experiment Manager
// Handles single-model Human-LLM interaction experiments
// ============================================================================

import { OpenRouterAPI } from "../openrouter";
import { thinkingExtractor } from "../thinking-extractor";
import WebSocketManager, { ExperimentEvent, StreamingMessage } from "../websocket-manager";
import { JudgeEvaluator } from "../judge-evaluator";
import type { 
  StarChamberExperimentConfig, 
  StarChamberMessage, 
  ModelMetrics, 
  SentimentData,
  LogprobsData,
  TokenLogprob,
} from "../core/types";

// ============ Global Singleton ============

declare global {
  var __starChamberManagerInstance: StarChamberManager | undefined;
}

// ============ Types ============

interface StarChamberState {
  experimentId: string;
  config: StarChamberExperimentConfig;
  isRunning: boolean;
  currentTurn: number;
  conversation: StarChamberMessage[];
  conversationHistory: Array<{ role: string; content: string }>;
  metrics: ModelMetrics;
  startTime?: Date;
  endTime?: Date;
}

interface StartExperimentParams {
  experimentId: string;
  config: StarChamberExperimentConfig;
  firstMessage: string;
}

// ============ Manager Class ============

export class StarChamberManager {
  private experiments: Map<string, StarChamberState> = new Map();
  private openrouterClients: Map<string, OpenRouterAPI> = new Map();
  private wsManager: WebSocketManager;
  private judgeEvaluator: JudgeEvaluator;
  private instanceId: string;

  constructor() {
    this.instanceId = `SCM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🔬 StarChamberManager constructor - Instance: ${this.instanceId}`);
    
    this.wsManager = WebSocketManager.getInstance();
    this.judgeEvaluator = new JudgeEvaluator();
  }

  // ============ Experiment Lifecycle ============

  async startExperiment(params: StartExperimentParams): Promise<void> {
    const { experimentId, config, firstMessage } = params;
    
    console.log(`🔬 Starting StarChamber experiment: ${experimentId}`);
    
    // Create OpenRouter client for this experiment
    const openrouterClient = new OpenRouterAPI(config.model.apiKey);
    this.openrouterClients.set(experimentId, openrouterClient);

    // Initialize conversation with system context
    const conversationHistory: Array<{ role: string; content: string }> = [];
    
    if (config.systemContext?.trim()) {
      conversationHistory.push({
        role: "system",
        content: config.systemContext.trim(),
      });
    }

    // Add researcher's first message
    conversationHistory.push({
      role: "user",
      content: firstMessage,
    });

    // Initialize state
    const state: StarChamberState = {
      experimentId,
      config,
      isRunning: true,
      currentTurn: 1,
      conversation: [],
      conversationHistory,
      metrics: {
        tokensUsed: 0,
        turnsCompleted: 0,
        goalDeviationScore: 0,
        turnsToDeviate: null,
        sentimentHistory: [],
      },
      startTime: new Date(),
    };

    this.experiments.set(experimentId, state);

    // Emit experiment started event
    this.emitEvent(experimentId, "experiment_started", {
      experimentId,
      config,
    });

    // Process the first turn (get model response)
    await this.processModelResponse(experimentId);
  }

  async processResearcherMessage(experimentId: string, message: string): Promise<void> {
    const state = this.experiments.get(experimentId);
    if (!state) {
      throw new Error(`Experiment ${experimentId} not found`);
    }
    
    if (!state.isRunning) {
      throw new Error(`Experiment ${experimentId} is not running`);
    }

    // Add researcher message to conversation history
    state.conversationHistory.push({
      role: "user",
      content: message,
    });

    // Increment turn
    state.currentTurn++;

    // Emit that we received the message
    this.emitEvent(experimentId, "model_responding", {
      turnNumber: state.currentTurn,
    });

    // Get model response
    await this.processModelResponse(experimentId);
  }

  async stopExperiment(experimentId: string): Promise<void> {
    const state = this.experiments.get(experimentId);
    if (!state) {
      console.warn(`Experiment ${experimentId} not found for stopping`);
      return;
    }

    state.isRunning = false;
    state.endTime = new Date();

    // Emit experiment stopped
    this.emitEvent(experimentId, "experiment_stopped", {
      experimentId,
      totalTurns: state.currentTurn,
      metrics: state.metrics,
    });

    console.log(`🔬 StarChamber experiment stopped: ${experimentId}`);
  }

  // ============ Model Response Processing ============

  private async processModelResponse(experimentId: string): Promise<void> {
    const state = this.experiments.get(experimentId);
    if (!state || !state.isRunning) return;

    const openrouterClient = this.openrouterClients.get(experimentId);
    if (!openrouterClient) {
      throw new Error(`OpenRouter client not found for experiment ${experimentId}`);
    }

    const modelName = state.config.model.modelId;
    
    // Create streaming message for real-time updates
    const streamingMessage: StreamingMessage = {
      id: `sc-stream-${Date.now()}`,
      model: "starchamber",
      content: "",
      thinking: "",
      isComplete: false,
      turnNumber: state.currentTurn,
    };

    try {
      console.log(`🤖 Getting model response for turn ${state.currentTurn}`);

      // Emit that model is responding
      this.emitEvent(experimentId, "model_responding", {
        turnNumber: state.currentTurn,
      });

      // Emit initial streaming message
      this.wsManager.emitStreamingMessage(experimentId, streamingMessage);

      // Make streaming API call
      const stream = await openrouterClient.streamChatCompletion(
        modelName,
        state.conversationHistory,
        {
          temperature: 0.7,
          maxTokens: 6144,
          includeLogprobs: state.config.requestLogprobs,
        },
        // Stream callback
        (chunk: string, done: boolean, metadata?: any) => {
          if (!state.isRunning) return;

          // Extract thinking traces from streaming content
          const { content, thinking } = thinkingExtractor.extractThinkingFromStream(
            streamingMessage.content + chunk
          );

          streamingMessage.content = content;
          if (thinking) {
            streamingMessage.thinking = thinking;
          }
          streamingMessage.isComplete = done;

          // Emit streaming update
          this.wsManager.emitStreamingMessage(experimentId, streamingMessage);
        }
      );

      // Process final response
      if (!state.isRunning) return;

      // Extract thinking from final content
      const { content: finalContent, thinking: finalThinking } = 
        thinkingExtractor.extractThinkingFromStream(streamingMessage.content);

      // Process logprobs if available
      let logprobsData: LogprobsData | undefined;
      if (stream.logprobs) {
        logprobsData = this.processLogprobs(stream.logprobs);
      } else if (state.config.requestLogprobs) {
        logprobsData = { available: false, tokens: [], averageConfidence: 0, lowConfidenceTokens: [] };
      }

      // Create the model message
      const modelMessage: StarChamberMessage = {
        id: `sc-model-${Date.now()}`,
        role: "model",
        senderName: state.config.model.modelName || modelName,
        content: finalContent,
        thinking: finalThinking || undefined,
        turnNumber: state.currentTurn,
        timestamp: new Date(),
        tokensUsed: stream.usage?.total_tokens || 0,
        logprobs: logprobsData,
      };

      // Add to state
      state.conversation.push(modelMessage);
      state.conversationHistory.push({
        role: "assistant",
        content: finalContent,
      });

      // Update metrics
      state.metrics.tokensUsed += stream.usage?.total_tokens || 0;
      state.metrics.turnsCompleted = state.currentTurn;

      if (logprobsData?.available) {
        // Calculate running average confidence
        const prevAvg = state.metrics.averageLogprobConfidence || 0;
        const prevCount = state.metrics.turnsCompleted - 1;
        state.metrics.averageLogprobConfidence = 
          (prevAvg * prevCount + logprobsData.averageConfidence) / state.metrics.turnsCompleted;
      }

      // Emit response complete
      this.emitEvent(experimentId, "model_response_complete", {
        turnNumber: state.currentTurn,
        modelName: state.config.model.modelName || modelName,
        message: modelMessage,
      });

      // Run judge evaluation in background
      this.evaluateModelResponse(experimentId, modelMessage, state);

    } catch (error) {
      console.error(`Error getting model response:`, error);
      
      this.emitEvent(experimentId, "error", {
        message: error instanceof Error ? error.message : "Failed to get model response",
        turnNumber: state.currentTurn,
      });
    }
  }

  // ============ Judge Evaluation ============

  private async evaluateModelResponse(
    experimentId: string, 
    message: StarChamberMessage,
    state: StarChamberState
  ): Promise<void> {
    try {
      // Use judge evaluator to analyze sentiment
      const evaluation = await this.judgeEvaluator.evaluateTurn(
        state.conversationHistory,
        message.content,
        "model", // Single model in StarChamber
        state.currentTurn
      );

      if (evaluation) {
        const sentimentData: SentimentData = {
          turn: state.currentTurn,
          happiness: evaluation.sentiment?.happiness || 0,
          sadness: evaluation.sentiment?.sadness || 0,
          anger: evaluation.sentiment?.anger || 0,
          hopelessness: evaluation.sentiment?.hopelessness || 0,
          excitement: evaluation.sentiment?.excitement || 0,
          fear: evaluation.sentiment?.fear || 0,
          deception: evaluation.sentiment?.deception || 0,
        };

        // Update metrics
        state.metrics.sentimentHistory.push(sentimentData);
        state.metrics.goalDeviationScore = evaluation.goalDeviation || 0;
        state.metrics.lastBehavioralNotes = evaluation.behavioralNotes;

        // Emit sentiment update
        this.emitEvent(experimentId, "sentiment_update", {
          turnNumber: state.currentTurn,
          sentiment: sentimentData,
          behavioralNotes: evaluation.behavioralNotes,
        });

        // Emit metrics update
        this.wsManager.emitModelMetrics(experimentId, "single", state.metrics);
      }
    } catch (error) {
      console.error("Judge evaluation failed:", error);
      // Don't throw - evaluation failure shouldn't stop the experiment
    }
  }

  // ============ Logprobs Processing ============

  private processLogprobs(rawLogprobs: any): LogprobsData {
    if (!rawLogprobs?.content || !Array.isArray(rawLogprobs.content)) {
      return { available: false, tokens: [], averageConfidence: 0, lowConfidenceTokens: [] };
    }

    const tokens: TokenLogprob[] = rawLogprobs.content.map((item: any) => {
      const probability = Math.exp(item.logprob);
      
      const topAlternatives = item.top_logprobs?.map((alt: any) => ({
        token: alt.token,
        logprob: alt.logprob,
        probability: Math.exp(alt.logprob),
      }));

      return {
        token: item.token,
        logprob: item.logprob,
        probability,
        topAlternatives,
      };
    });

    // Calculate average confidence
    const totalProb = tokens.reduce((sum, t) => sum + t.probability, 0);
    const averageConfidence = tokens.length > 0 ? totalProb / tokens.length : 0;

    // Find low confidence tokens (< 50% probability)
    const lowConfidenceTokens = tokens.filter(t => t.probability < 0.5);

    return {
      available: true,
      tokens,
      averageConfidence,
      lowConfidenceTokens,
    };
  }

  // ============ Helper Methods ============

  private emitEvent(experimentId: string, type: string, data: any): void {
    const event: ExperimentEvent = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.wsManager.emitExperimentEvent(experimentId, event);
  }

  getExperimentState(experimentId: string): StarChamberState | undefined {
    return this.experiments.get(experimentId);
  }

  isExperimentRunning(experimentId: string): boolean {
    const state = this.experiments.get(experimentId);
    return state?.isRunning ?? false;
  }
}

// ============ Singleton Instance ============

export function getStarChamberManager(): StarChamberManager {
  // Use global singleton for consistency across module reloads
  if (!global.__starChamberManagerInstance) {
    global.__starChamberManagerInstance = new StarChamberManager();
    console.log("🔬 Created new StarChamberManager singleton");
  }
  return global.__starChamberManagerInstance;
}

export default StarChamberManager;

