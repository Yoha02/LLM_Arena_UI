import { 
  ExperimentConfig, 
  ExperimentState, 
  ChatMessage, 
  ModelMetrics, 
  SentimentData 
} from './types';
import { OpenRouterAPI } from './openrouter';
import { thinkingExtractor } from './thinking-extractor';
import WebSocketManager, { ExperimentEvent, StreamingMessage } from './websocket-manager';
import { JudgeEvaluator } from './judge-evaluator';

// Global singleton registry that persists across module contexts
declare global {
  var __experimentManagerInstance: ExperimentManager | undefined;
}

export class ExperimentManager {
  private state: ExperimentState;
  private openrouterA: OpenRouterAPI;
  private openrouterB: OpenRouterAPI;
  private config: ExperimentConfig | null = null;
  private isProcessingTurn: boolean = false;
  private turnTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private ttlTimeoutId: ReturnType<typeof setTimeout> | null = null; // TTL safety timeout
  private wsManager: WebSocketManager;
  private experimentId: string = 'default';
  private judgeEvaluator: JudgeEvaluator;
  private manualStopRequested: boolean = false; // NEW: Flag for manual stops
  private instanceId: string; // NEW: Track instance identity

  constructor() {
    // Generate unique instance ID for debugging
    this.instanceId = `EM_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log(`🏗️ ExperimentManager constructor called - Instance: ${this.instanceId}`);
    
    this.state = {
      isRunning: false,
      currentTurn: 0,
      conversation: [],
      metricsA: {
        tokensUsed: 0,
        goalDeviationScore: 0,
        turnsToDeviate: null,
        sentimentHistory: []
      },
      metricsB: {
        tokensUsed: 0,
        goalDeviationScore: 0,
        turnsToDeviate: null,
        sentimentHistory: []
      }
    };
    
    // Initialize flags
    this.isProcessingTurn = false;
    this.turnTimeoutId = null;
    this.ttlTimeoutId = null;
    
    // Initialize WebSocket manager (will auto-initialize when needed)
    this.wsManager = WebSocketManager.getInstance();
    this.experimentId = 'default';
    
    // Initialize OpenRouter clients (will be configured with API keys later)
    this.openrouterA = new OpenRouterAPI();
    this.openrouterB = new OpenRouterAPI();
    
    // Initialize judge evaluator
    this.judgeEvaluator = new JudgeEvaluator();
  }

  /**
   * Helper method to safely clear TTL timeout when experiment stops
   */
  private clearTTLTimeout(): void {
    if (this.ttlTimeoutId) {
      clearTimeout(this.ttlTimeoutId);
      this.ttlTimeoutId = null;
      console.log('🕐 Cleared TTL safety timeout');
    }
  }

  /**
   * Helper method to stop experiment with proper cleanup
   */
  private cleanStopExperiment(reason: string): void {
    this.state.isRunning = false;
    this.state.endTime = new Date();
    this.isProcessingTurn = false;
    this.clearTTLTimeout(); // Always clear TTL timeout when stopping
    
    // Clear any pending turn timeout
    if (this.turnTimeoutId) {
      clearTimeout(this.turnTimeoutId);
      this.turnTimeoutId = null;
    }
    
    console.log(`🛑 Experiment stopped cleanly: ${reason}`);
  }

  /**
   * Get singleton instance using global registry
   */
  static getInstance(): ExperimentManager {
    if (!global.__experimentManagerInstance) {
      console.log('🔥 Creating NEW ExperimentManager singleton instance (global registry)');
      global.__experimentManagerInstance = new ExperimentManager();
    } else {
      console.log(`🔄 Returning EXISTING ExperimentManager instance: ${global.__experimentManagerInstance.instanceId}`);
    }
    return global.__experimentManagerInstance;
  }

  /**
   * Start a new experiment with the given configuration
   */
  async startExperiment(config: ExperimentConfig): Promise<void> {
    console.log(`🚀 Starting experiment on instance: ${this.instanceId}`);
    if (this.state.isRunning) {
      throw new Error('Experiment is already running');
    }

    this.config = config;
    
    // Generate unique experiment ID
    this.experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize OpenRouter clients with the provided API keys
    this.openrouterA = new OpenRouterAPI(config.apiKeyA);
    this.openrouterB = new OpenRouterAPI(config.apiKeyB);
    
    // Configure judge evaluator with API key (use same as Model A)
    this.judgeEvaluator.updateApiKey(config.apiKeyA);

    // Reset state
    this.state = {
      isRunning: true,
      currentTurn: 0,
      conversation: [],
      metricsA: {
        tokensUsed: 0,
        goalDeviationScore: 0,
        turnsToDeviate: null,
        sentimentHistory: []
      },
      metricsB: {
        tokensUsed: 0,
        goalDeviationScore: 0,
        turnsToDeviate: null,
        sentimentHistory: []
      },
      startTime: new Date()
    };

    // Reset processing flags
    this.isProcessingTurn = false;
    this.turnTimeoutId = null;
    this.ttlTimeoutId = null;
    this.manualStopRequested = false; // NEW: Reset stop flag when starting

    // 🕐 TTL SAFETY: Auto-stop experiment after 1 hour (3600000ms) as ultimate failsafe
    this.ttlTimeoutId = setTimeout(() => {
      console.log('🚨 TTL TIMEOUT: Experiment has been running for 1 hour - AUTO-STOPPING as safety measure');
      console.log(`🕐 TTL auto-stop triggered for experiment: ${this.experimentId} on instance: ${this.instanceId}`);
      
      if (this.state.isRunning) {
        this.state.isRunning = false;
        this.state.endTime = new Date();
        this.isProcessingTurn = false;
        
        // Reset manual mode state for TTL timeout
        this.state.waitingForUser = false;
        this.state.nextExpectedModel = undefined;
        this.state.pauseReason = '';
        this.manualStopRequested = false;
        
        // Clear any pending turn timeout
        if (this.turnTimeoutId) {
          clearTimeout(this.turnTimeoutId);
          this.turnTimeoutId = null;
        }
        
        // Emit stopped event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'experiment_stopped',
          data: {
            finalTurn: this.state.currentTurn,
            totalMessages: this.state.conversation.length,
            endTime: this.state.endTime,
            reason: 'ttl_timeout'
          },
          timestamp: new Date()
        });
        
        console.log('✅ TTL auto-stop completed - experiment terminated after 1 hour');
      }
      
      this.ttlTimeoutId = null;
    }, 3600000); // 1 hour = 3600000 milliseconds

    console.log(`🕐 TTL safety timeout set: experiment will auto-stop after 1 hour if still running`);

    console.log('Experiment started with config:', config);
    
    // Emit experiment started event to ALL connected clients first
    console.log('🚀 About to broadcast experiment_created to all clients...');
    console.log('🔍 WebSocket Manager state:', !!this.wsManager, 'IO instance:', !!this.wsManager?.getIO());
    
    this.wsManager.emitToAll('experiment_created', {
      experimentId: this.experimentId,
      config: {
        ...config,
        // Don't send API keys
        apiKeyA: '***',
        apiKeyB: '***'
      },
      timestamp: new Date()
    });
    
    console.log('✅ Broadcast call completed');
    
    // Also emit to the specific experiment room (in case clients are already there)
    this.wsManager.emitExperimentEvent(this.experimentId, {
      type: 'experiment_started',
      data: { config, experimentId: this.experimentId },
      timestamp: new Date()
    });
    
    console.log(`🎯 Experiment ${this.experimentId} created, allowing immediate client connections...`);
    
    // Give clients a brief moment to join the room (reduced from 2000ms to 500ms)
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Process the first turn
    try {
      console.log('Starting first turn processing...');
      await this.processTurn();
      console.log('First turn completed successfully');
    } catch (error) {
      console.error('Failed to process first turn:', error);
      this.state.isRunning = false;
      this.isProcessingTurn = false; // Reset flag on error
      if (this.turnTimeoutId) {
        clearTimeout(this.turnTimeoutId);
        this.turnTimeoutId = null;
      }
      this.state.error = `First turn failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      // Emit error event
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'experiment_error',
        data: { error: this.state.error },
        timestamp: new Date()
      });
      
      throw error; // Re-throw to show in API response
    }
  }

    /**
   * Stop the running experiment
   */
async stopExperiment(): Promise<void> {
    console.log(`🛑 Manual stop requested - Instance: ${this.instanceId}`);
    console.log('🛑 Current state:', {
      instanceId: this.instanceId,
      currentTurn: this.state.currentTurn,
      isRunning: this.state.isRunning,
      isProcessingTurn: this.isProcessingTurn,
      experimentId: this.experimentId,
      manualStopRequested: this.manualStopRequested,
      waitingForUser: this.state.waitingForUser
    });
    
    // Set flag for any ongoing processing
    this.manualStopRequested = true;
    console.log(`🛑 Stop flag set to: ${this.manualStopRequested} on instance: ${this.instanceId}`);
    
    // Clear any scheduled turn timeout immediately
    if (this.turnTimeoutId) {
      clearTimeout(this.turnTimeoutId);
      this.turnTimeoutId = null;
      console.log('🛑 Cleared scheduled timeout');
    }
    
    // Clear TTL safety timeout
    this.clearTTLTimeout();
    
    // 🔧 IMMEDIATE CLEANUP: Always clean up state immediately for manual stops
    // This ensures the experiment is properly stopped regardless of processing state
    console.log('🛑 Performing immediate cleanup for manual stop');
    this.state.isRunning = false;
    this.state.endTime = new Date();
    this.state.waitingForUser = false;
    this.state.nextExpectedModel = undefined;
    this.state.pauseReason = '';
    this.isProcessingTurn = false; // Also reset processing flag
    this.manualStopRequested = false; // Reset flag after cleanup
    
    console.log('🛑 State cleaned up immediately:', {
      isRunning: this.state.isRunning,
      isProcessingTurn: this.isProcessingTurn,
      waitingForUser: this.state.waitingForUser,
      manualStopRequested: this.manualStopRequested
    });
    
    // Emit stopped event
    this.wsManager.emitExperimentEvent(this.experimentId, {
      type: 'experiment_stopped',
      data: {
        finalTurn: this.state.currentTurn,
        totalMessages: this.state.conversation.length,
        endTime: this.state.endTime,
        reason: 'manual_stop'
      },
      timestamp: new Date()
    });
    
    console.log('🛑 Manual stop completed - experiment fully stopped');
  }

  /**
   * Process a single turn of the conversation
   */
  async processTurn(): Promise<ChatMessage[]> {
    console.log(`processTurn called on instance: ${this.instanceId} - isRunning:${this.state.isRunning} hasConfig:${!!this.config} isProcessingTurn:${this.isProcessingTurn} manualStopRequested:${this.manualStopRequested}`);
    
    if (!this.state.isRunning || !this.config) {
      const error = 'No experiment is running';
      this.state.error = error;
      throw new Error(error);
    }

    // Prevent concurrent processTurn calls
    if (this.isProcessingTurn) {
      console.log('Another turn is already being processed, skipping...');
      return [];
    }

    // Check for max turns limit (skip if unlimited: -1)
    if (this.config.maxTurns !== -1 && this.state.currentTurn >= this.config.maxTurns) {
      console.log(`Max turns reached (${this.state.currentTurn}/${this.config.maxTurns}), stopping experiment`);
      this.state.isRunning = false;
      this.state.endTime = new Date();
      this.isProcessingTurn = false;
      this.clearTTLTimeout(); // Clear TTL timeout on natural completion
      
      // Emit experiment stopped event for natural completion
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'experiment_stopped',
        data: { 
          finalTurn: this.state.currentTurn,
          totalMessages: this.state.conversation.length,
          endTime: this.state.endTime,
          reason: 'max_turns'
        },
        timestamp: new Date()
      });
      
      return [];
    }

    // 🛑 NEW: Check for manual stop request (same pattern as max turns)
    if (this.manualStopRequested) {
      console.log(`🛑 Manual stop requested (turn ${this.state.currentTurn}), stopping experiment`);
      this.state.isRunning = false;
      this.state.endTime = new Date();
      this.isProcessingTurn = false;
      this.manualStopRequested = false; // Reset flag
      
      // Emit experiment stopped event for manual stop
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'experiment_stopped',
        data: { 
          finalTurn: this.state.currentTurn,
          totalMessages: this.state.conversation.length,
          endTime: this.state.endTime,
          reason: 'manual_stop'
        },
        timestamp: new Date()
      });
      
      return [];
    }

    // Mark as processing
    this.isProcessingTurn = true;

    const turnMessages: ChatMessage[] = [];
    let hasErrors = false;
    
    // Emit turn started event
    this.wsManager.emitExperimentEvent(this.experimentId, {
      type: 'turn_started',
      data: { 
        turn: this.state.currentTurn + 1,
        modelA: this.config.modelA,
        modelB: this.config.modelB
      },
      timestamp: new Date()
    });
    
    try {
      // 🎮 MANUAL MODE: Pause before Model A for user to edit prompt
      if (this.config && this.config.experimentMode === 'manual') {
        console.log('🎮 Manual mode: Pausing before Model A for user to edit prompt');
        this.state.waitingForUser = true;
        this.state.nextExpectedModel = 'A';
        this.state.pauseReason = 'turn_start';
        this.isProcessingTurn = false;
        
        // Emit waiting for user event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'waiting_for_user',
          data: {
            reason: 'turn_start',
            currentTurn: this.state.currentTurn + 1,
            nextModel: 'A',
            canContinue: true,
            conversation: this.state.conversation, // Include current conversation
            config: this.config // Include config for prompt building
          },
          timestamp: new Date()
        });
        
        // Return early - user will manually trigger Model A
        return turnMessages;
      }
      
      console.log('Processing Model A:', this.config.modelA);
      // Model A's turn
      const messageA = await this.processModelResponse('A', this.config.modelA);
      console.log('Model A response received:', { 
        id: messageA.id, 
        content: messageA.content?.substring(0, 100) + '...', 
        hasContent: !!messageA.content,
        hasError: messageA.content.includes('Error') 
      });
      turnMessages.push(messageA);
      
      // 🛑 Check if experiment was stopped during Model A processing
      if (this.manualStopRequested || !this.state.isRunning) {
        console.log('🛑 Experiment stopped during Model A processing - stopping turn');
        
        // Ensure complete cleanup if manual stop was requested
        if (this.manualStopRequested) {
          this.state.isRunning = false;
          this.state.endTime = new Date();
          this.isProcessingTurn = false;
          console.log(`🛑 State cleaned up after Model A: isRunning=${this.state.isRunning}, isProcessingTurn=${this.isProcessingTurn}`);
          
          // Emit stopped event
          this.wsManager.emitExperimentEvent(this.experimentId, {
            type: 'experiment_stopped',
            data: {
              finalTurn: this.state.currentTurn,
              totalMessages: this.state.conversation.length,
              endTime: this.state.endTime,
              reason: 'manual_stop'
            },
            timestamp: new Date()
          });
          
          // Reset flag after handling
          this.manualStopRequested = false;
        }
        
        this.isProcessingTurn = false;
        return turnMessages;
      }
      
      // Check if messageA contains a REAL API error (not just the word "error" in content)
      if (messageA.content.startsWith('⚠️ API Error:') || messageA.content.startsWith('Error calling OpenRouter:')) {
        hasErrors = true;
        this.state.error = `Model A: ${messageA.thinking || messageA.content}`;
        console.log('Model A API error detected:', this.state.error);
        // Early return if Model A has REAL API errors
        this.state.isRunning = false;
        this.isProcessingTurn = false;
        return turnMessages;
      }
      
      // ✅ CRITICAL FIX: Add Model A's message to conversation BEFORE Model B processes
      this.state.conversation.push(messageA);
      console.log('Added Model A message to conversation. New length:', this.state.conversation.length);
      
      // 🎮 MANUAL MODE: Pause after Model A for user to edit prompt for Model B
      if (this.config && this.config.experimentMode === 'manual') {
        console.log('🎮 Manual mode: Pausing after Model A for user to edit prompt for Model B');
        this.state.waitingForUser = true;
        this.state.nextExpectedModel = 'B';
        this.state.pauseReason = 'model_completed';
        this.isProcessingTurn = false;
        
        // Emit waiting for user event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'waiting_for_user',
          data: {
            reason: 'model_completed',
            currentTurn: this.state.currentTurn + 1,
            nextModel: 'B',
            canContinue: true,
            conversation: this.state.conversation, // Include current conversation
            config: this.config // Include config for prompt building
          },
          timestamp: new Date()
        });
        
        // Return early - user will manually trigger Model B
        return turnMessages;
      }
      
      // NOTE: Model A's metrics are already sent via targeted emission in processModelResponse()
      // No need for additional full state emission here to prevent flickering
      
      console.log('Processing Model B:', this.config.modelB);
      // Model B's turn (now sees Model A's new message in conversation history)
      const messageB = await this.processModelResponse('B', this.config.modelB);
      console.log('Model B response received:', { 
        id: messageB.id, 
        content: messageB.content?.substring(0, 100) + '...', 
        hasContent: !!messageB.content,
        hasError: messageB.content.includes('Error') 
      });
      turnMessages.push(messageB);
      
      // 🛑 Check if experiment was stopped during Model B processing
      if (this.manualStopRequested || !this.state.isRunning) {
        console.log('🛑 Experiment stopped during Model B processing - stopping turn');
        
        // Ensure complete cleanup if manual stop was requested
        if (this.manualStopRequested) {
          this.state.isRunning = false;
          this.state.endTime = new Date();
          this.isProcessingTurn = false;
          console.log(`🛑 State cleaned up after Model B: isRunning=${this.state.isRunning}, isProcessingTurn=${this.isProcessingTurn}`);
          
          // Emit stopped event
          this.wsManager.emitExperimentEvent(this.experimentId, {
            type: 'experiment_stopped',
            data: {
              finalTurn: this.state.currentTurn,
              totalMessages: this.state.conversation.length,
              endTime: this.state.endTime,
              reason: 'manual_stop'
            },
            timestamp: new Date()
          });
          
          // Reset flag after handling
          this.manualStopRequested = false;
        }
        
        this.isProcessingTurn = false;
        return turnMessages;
      }
      
      // Check if messageB contains a REAL API error (not just the word "error" in content)
      if (messageB.content.startsWith('⚠️ API Error:') || messageB.content.startsWith('Error calling OpenRouter:')) {
        hasErrors = true;
        this.state.error = `Model B: ${messageB.thinking || messageB.content}`;
        console.log('Model B API error detected:', this.state.error);
      }
      
      // ✅ Add Model B's message to conversation too
      this.state.conversation.push(messageB);
      console.log('Added Model B message to conversation. Final length:', this.state.conversation.length);

      this.state.currentTurn++;
      
      // 🔍 JUDGE EVALUATION: Run for BOTH manual and automatic modes with timeout
      console.log('🔍 Starting judge evaluation for turn', this.state.currentTurn);
      console.log('🔍 Judge API key exists:', !!this.judgeEvaluator);
      console.log('🔍 Messages for evaluation:', { messageA: !!messageA, messageB: !!messageB });
      
      // Emit judge evaluation started event
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'judge_evaluation_started',
        data: {
          turn: this.state.currentTurn,
          analyzing: true
        },
        timestamp: new Date()
      });
      
      // Create a promise with timeout to prevent hanging
      const judgeEvaluationPromise = async () => {
        const originalPrompts = {
          shared: this.config?.promptingMode === 'shared' ? this.config?.sharedPrompt : undefined,
          promptA: this.config?.promptingMode === 'individual' ? this.config?.promptA : undefined,
          promptB: this.config?.promptingMode === 'individual' ? this.config?.promptB : undefined
        };

        // Remove current turn messages from history to avoid duplication in judge analysis
        const historyWithoutCurrentTurn = this.state.conversation.slice(0, -2);
        
        const turnAnalysis = await this.judgeEvaluator.evaluateTurn(
          this.state.currentTurn,
          messageA,
          messageB,
          originalPrompts,
          historyWithoutCurrentTurn
        );

        // Apply judge evaluation to metrics
        this.judgeEvaluator.updateMetricsWithJudgeEvaluation(
          this.state.metricsA, 
          turnAnalysis.modelA, 
          this.state.currentTurn
        );
        
        this.judgeEvaluator.updateMetricsWithJudgeEvaluation(
          this.state.metricsB, 
          turnAnalysis.modelB, 
          this.state.currentTurn
        );

        console.log('✅ Comprehensive judge evaluation completed:', {
          turn: this.state.currentTurn,
          modelA: {
            goalDeviation: turnAnalysis.modelA.goalDeviationScore,
            cooperation: turnAnalysis.modelA.cooperationScore,
            sentiment: turnAnalysis.modelA.sentimentAnalysis
          },
          modelB: {
            goalDeviation: turnAnalysis.modelB.goalDeviationScore,
            cooperation: turnAnalysis.modelB.cooperationScore,
            sentiment: turnAnalysis.modelB.sentimentAnalysis
          },
          interactionDynamics: turnAnalysis.interactionDynamics
        });

        // 🚀 CRITICAL FIX: Emit targeted metrics updates for both transport types
        console.log('📡 Emitting judge-updated metrics for both models...');
        this.wsManager.emitModelMetrics(this.experimentId, 'A', this.state.metricsA);
        this.wsManager.emitModelMetrics(this.experimentId, 'B', this.state.metricsB);
        console.log('✅ Judge metrics successfully emitted for both WebSocket and polling transports');
        
        // Emit judge evaluation completed event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'judge_evaluation_completed',
          data: {
            turn: this.state.currentTurn,
            analyzing: false,
            results: {
              modelA: {
                goalDeviation: turnAnalysis.modelA.goalDeviationScore,
                cooperation: turnAnalysis.modelA.cooperationScore,
                sentiment: turnAnalysis.modelA.sentimentAnalysis
              },
              modelB: {
                goalDeviation: turnAnalysis.modelB.goalDeviationScore,
                cooperation: turnAnalysis.modelB.cooperationScore,
                sentiment: turnAnalysis.modelB.sentimentAnalysis
              }
            }
          },
          timestamp: new Date()
        });
        
        return turnAnalysis;
      };

      // Run with timeout to prevent hanging
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Judge evaluation timeout after 30 seconds')), 30000);
        });
        
        await Promise.race([judgeEvaluationPromise(), timeoutPromise]);
        
      } catch (error) {
        console.error('❌ Judge evaluation failed:', error);
        console.log('📊 Proceeding without judge evaluation - using default metrics');
        
        // Emit judge evaluation failed event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'judge_evaluation_completed',
          data: {
            turn: this.state.currentTurn,
            analyzing: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date()
        });
      }
      
      // 🎮 MANUAL MODE: Pause after Model B for user to decide on next turn
      if (this.config && this.config.experimentMode === 'manual') {
        console.log('🎮 Manual mode: Pausing after Model B for user to decide on next turn');
        this.state.waitingForUser = true;
        this.state.nextExpectedModel = 'A';
        this.state.pauseReason = 'turn_completed';
        this.isProcessingTurn = false;
        
        // Emit turn completed event first
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'turn_completed',
          data: {
            turn: this.state.currentTurn,
            messages: [messageA, messageB],
            totalMessages: this.state.conversation.length
          },
          timestamp: new Date()
        });
        
        // Then emit waiting for user event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'waiting_for_user',
          data: {
            reason: 'turn_completed',
            currentTurn: this.state.currentTurn,
            nextModel: 'A',
            canContinue: this.config.maxTurns === -1 || this.state.currentTurn < this.config.maxTurns,
            conversation: this.state.conversation, // Include current conversation
            config: this.config // Include config for prompt building
          },
          timestamp: new Date()
        });
        
        // Return early - user will manually trigger next turn or end experiment
        return turnMessages;
      }
      
      // ✅ Messages already added to conversation individually above
      
      console.log('Turn completed successfully:', {
        currentTurn: this.state.currentTurn, 
        maxTurns: this.config.maxTurns,
        conversationLength: this.state.conversation.length,
        messageIds: turnMessages.map(m => m.id),
        turnProgress: `${this.state.currentTurn}/${this.config.maxTurns}`,
        lastTwoMessages: this.state.conversation.slice(-2).map(msg => ({
          model: msg.model,
          turn: msg.turn,
          contentPreview: msg.content.substring(0, 100) + '...'
        }))
      });

      // Emit turn completed event
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'turn_completed',
        data: { 
          turn: this.state.currentTurn, 
          messages: turnMessages,
          totalMessages: this.state.conversation.length
        },
        timestamp: new Date()
      });

      // Emit current experiment state
      this.wsManager.emitExperimentState(this.experimentId, this.getState());

      // 🛑 Final check: Don't continue if experiment was stopped during this turn
      if (this.manualStopRequested || !this.state.isRunning) {
        console.log('🛑 Experiment stopped during turn processing - not scheduling next turn');
        
        // Ensure complete cleanup if manual stop was requested
        if (this.manualStopRequested) {
          this.state.isRunning = false;
          this.state.endTime = new Date();
          this.isProcessingTurn = false;
          console.log(`🛑 State cleaned up at final turn check: isRunning=${this.state.isRunning}, isProcessingTurn=${this.isProcessingTurn}`);
          
          // Emit stopped event
          this.wsManager.emitExperimentEvent(this.experimentId, {
            type: 'experiment_stopped',
            data: {
              finalTurn: this.state.currentTurn,
              totalMessages: this.state.conversation.length,
              endTime: this.state.endTime,
              reason: 'manual_stop'
            },
            timestamp: new Date()
          });
          
          // Reset flag after handling
          this.manualStopRequested = false;
        }
        
        this.isProcessingTurn = false;
        return turnMessages;
      }

      // Stop experiment if there were errors
      if (hasErrors) {
        console.log('Stopping experiment due to API errors');
        this.state.isRunning = false;
        this.isProcessingTurn = false;
      } else {
        // Handle manual vs automatic mode for turn progression
        if (this.config && this.config.experimentMode === 'manual') {
          console.log('🎮 Manual mode: Pausing for user input after turn completion');
          this.state.waitingForUser = true;
          this.state.nextExpectedModel = 'A'; // Next turn will start with Model A
          this.state.pauseReason = 'turn_completed';
          this.isProcessingTurn = false;
          
          // Emit waiting for user event
          this.wsManager.emitExperimentEvent(this.experimentId, {
            type: 'waiting_for_user',
            data: {
              reason: 'turn_completed',
              currentTurn: this.state.currentTurn,
              nextModel: 'A',
              canContinue: this.config.maxTurns === -1 || this.state.currentTurn < this.config.maxTurns,
              conversation: this.state.conversation, // Include current conversation
              config: this.config // Include config for prompt building
            },
            timestamp: new Date()
          });
        } else {
          // Automatic mode - continue to next turn if no errors and haven't reached max turns
          if (!this.manualStopRequested && (this.config.maxTurns === -1 || this.state.currentTurn < this.config.maxTurns)) {
            const turnsInfo = this.config.maxTurns === -1 ? 'unlimited turns' : `${this.state.currentTurn}/${this.config.maxTurns} turns`;
            console.log(`Scheduling next turn... (${turnsInfo})`);
            this.isProcessingTurn = false; // Reset flag before scheduling
            this.turnTimeoutId = setTimeout(() => this.processTurn(), 2000);
          } else {
            const reason = this.manualStopRequested ? 'manual stop requested' : 'max turns reached';
            console.log(`Experiment completed - ${reason}`);
            this.state.isRunning = false;
            this.state.endTime = new Date();
            this.isProcessingTurn = false;
            this.clearTTLTimeout(); // Clear TTL timeout on completion
            
            // Emit experiment stopped event for natural completion
            const stopReason = this.manualStopRequested ? 'manual_stop' : 'max_turns';
            this.wsManager.emitExperimentEvent(this.experimentId, {
              type: 'experiment_stopped',
              data: { 
                finalTurn: this.state.currentTurn,
                totalMessages: this.state.conversation.length,
                endTime: this.state.endTime,
                reason: stopReason
              },
              timestamp: new Date()
            });
            
            // Reset manual stop flag after handling
            if (this.manualStopRequested) {
              this.manualStopRequested = false;
            }
          }
        }
      }

      return turnMessages;
    } catch (error) {
      console.error('Error in processTurn:', error);
      this.state.error = `Experiment failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.state.isRunning = false;
      this.isProcessingTurn = false; // Reset flag on error
      throw error; // Re-throw for debugging
    }
  }

  /**
   * Process a single model response
   */
  private async processModelResponse(
    model: 'A' | 'B', 
    modelName: string,
    customPrompt?: string
  ): Promise<ChatMessage> {
    
    // 🛑 Check for stop request before starting any model processing
    if (this.manualStopRequested) {
      console.log(`🛑 Manual stop detected - aborting Model ${model} processing before it starts`);
      
      // Perform complete cleanup when stopping during model processing
      this.state.isRunning = false;
      this.state.endTime = new Date();
      this.isProcessingTurn = false;
      console.log(`🛑 State cleaned up: isRunning=${this.state.isRunning}, isProcessingTurn=${this.isProcessingTurn}`);
      
      // Emit stopped event
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'experiment_stopped',
        data: {
          finalTurn: this.state.currentTurn,
          totalMessages: this.state.conversation.length,
          endTime: this.state.endTime,
          reason: 'manual_stop'
        },
        timestamp: new Date()
      });
      
      // Reset flag after handling
      this.manualStopRequested = false;
      
      return {
        id: `${model}-${this.state.currentTurn + 1}`,
        model,
        modelName,
        turn: this.state.currentTurn + 1,
        content: '[⚠️ Model processing cancelled - experiment stopped]',
        thinking: '',
        timestamp: new Date(),
        tokensUsed: 0
      };
    }
    if (!this.config) {
      throw new Error('No experiment configuration available');
    }

    const openrouterClient = model === 'A' ? this.openrouterA : this.openrouterB;
    const isFirstTurn = this.state.currentTurn === 0;
    
    // Build conversation history for this model
    const conversationHistory = this.buildConversationHistory(model);
    
    // Get the appropriate prompt (use custom prompt if provided)
    const prompt = this.getPromptForModel(model, isFirstTurn, customPrompt);
    
    // Enhance prompt with thinking instructions
    const enhancedPrompt = thinkingExtractor.generateThinkingPrompt(modelName, prompt);
    
    // Add current prompt to conversation
    conversationHistory.push({
      role: 'user',
      content: enhancedPrompt
    });

    try {
      // Create streaming message object
      const streamingMessage: StreamingMessage = {
        id: `${model}-${this.state.currentTurn + 1}`,
        content: '',
        isComplete: false,
        model,
        modelName,
        turn: this.state.currentTurn + 1,
        thinking: '',
        tokensUsed: 0
      };

      // Emit initial streaming message
      this.wsManager.emitStreamingMessage(this.experimentId, streamingMessage);

      // Make streaming API call to OpenRouter with extended timeout
      const stream = await openrouterClient.streamChatCompletion(
        modelName,
        conversationHistory,
        {
          temperature: 0.7,
          maxTokens: 6144 // Increased for longer responses
        }
      );

      let fullContent = '';
      let fullResponse: any = null;
      let chunkCount = 0;
      let lastEmitTime = Date.now();
      const THROTTLE_MS = 100; // Emit updates at most every 100ms
      
      console.log(`Starting streaming for Model ${model} (${modelName}) on instance ${this.instanceId} - Stop flag: ${this.manualStopRequested}`);

      // 🛑 Double-check stop flag before starting stream
      if (this.manualStopRequested) {
        console.log(`🛑 Manual stop detected - aborting stream before it starts for Model ${model}`);
        return {
          id: `${model}-${this.state.currentTurn + 1}`,
          model,
          modelName,
          turn: this.state.currentTurn + 1,
          content: '[⚠️ Streaming cancelled - experiment stopped]',
          thinking: '',
          timestamp: new Date(),
          tokensUsed: 0
        };
      }

      // Add stream timeout protection (60 seconds)
      const streamTimeout = setTimeout(() => {
        console.warn(`⏰ Stream timeout for Model ${model} after 60 seconds`);
        // Note: We can't actually cancel the stream, but we can log the issue
      }, 60000);

      let streamCompleted = false;
      let lastChunkTime = Date.now();

      try {
        // Process the stream with enhanced real-time updates and timeout detection
        for await (const chunk of stream) {
          lastChunkTime = Date.now();
          chunkCount++;
          
          // 🛑 CRITICAL: Check if experiment was stopped during streaming (check EVERY chunk)
          if (this.manualStopRequested) {
            console.log(`🛑 MANUAL STOP DETECTED during Model ${model} streaming - breaking stream at chunk ${chunkCount}`);
            fullContent += ' [⚠️ Response interrupted - manual stop requested]';
            
            // Emit final update showing interruption
            streamingMessage.content = fullContent;
            streamingMessage.isComplete = true;
            this.wsManager.emitStreamingMessage(this.experimentId, streamingMessage);
            
            // Perform complete cleanup when stopping during streaming
            this.state.isRunning = false;
            this.state.endTime = new Date();
            this.isProcessingTurn = false;
            console.log(`🛑 State cleaned up during streaming: isRunning=${this.state.isRunning}, isProcessingTurn=${this.isProcessingTurn}`);
            
            // Emit stopped event
            this.wsManager.emitExperimentEvent(this.experimentId, {
              type: 'experiment_stopped',  
              data: {
                finalTurn: this.state.currentTurn,
                totalMessages: this.state.conversation.length,
                endTime: this.state.endTime,
                reason: 'manual_stop'
              },
              timestamp: new Date()
            });
            
            // Reset flag after handling
            this.manualStopRequested = false;
            
            streamCompleted = false;
            break; // Exit streaming loop immediately
          }
        
          // Handle content delta
          if (chunk.choices?.[0]?.delta?.content) {
            const deltaContent = chunk.choices[0].delta.content;
            fullContent += deltaContent;
          
                     // Throttle emissions to prevent overwhelming WebSocket
           const now = Date.now();
           if (now - lastEmitTime > THROTTLE_MS || chunkCount % 5 === 0) {
             streamingMessage.content = fullContent;
             this.wsManager.emitStreamingMessage(this.experimentId, streamingMessage);
             lastEmitTime = now;
             
             console.log(`Model ${model} streaming update: ${fullContent.length} chars, chunk ${chunkCount} [EXP: ${this.experimentId}]`);
           }
        }
        
        // Handle DeepSeek R1 reasoning delta (if available)
        if (chunk.choices?.[0]?.delta?.reasoning) {
          const deltaReasoning = chunk.choices[0].delta.reasoning;
          streamingMessage.thinking = (streamingMessage.thinking || '') + deltaReasoning;
          
          console.log(`🧠 Model ${model} reasoning delta received:`, {
            deltaLength: deltaReasoning.length,
            totalThinkingLength: streamingMessage.thinking.length,
            chunkNumber: chunkCount
          });
          
          // Emit thinking updates less frequently
          if (chunkCount % 10 === 0) {
            this.wsManager.emitStreamingMessage(this.experimentId, streamingMessage);
          }
        } else if (chunkCount === 1) {
          // Log on first chunk if no reasoning delta found
          console.log(`🧠 Model ${model} chunk structure:`, {
            hasChoices: !!chunk.choices,
            hasDelta: !!chunk.choices?.[0]?.delta,
            deltaKeys: chunk.choices?.[0]?.delta ? Object.keys(chunk.choices[0].delta) : [],
            hasReasoning: !!chunk.choices?.[0]?.delta?.reasoning
          });
        }
        
        // Store the full response for processing
        if (chunk.choices?.[0]?.message) {
          fullResponse = chunk;
        }
        
        // Handle completion
        if (chunk.choices?.[0]?.finish_reason) {
          console.log(`Model ${model} stream finished with reason: ${chunk.choices[0].finish_reason}`);
          streamCompleted = true;
          break;
        }

        // Check for stream stall (no chunks for 30 seconds)
        const timeSinceLastChunk = Date.now() - lastChunkTime;
        if (timeSinceLastChunk > 30000) {
          console.warn(`⚠️ Stream stalled for Model ${model} - ${timeSinceLastChunk}ms since last chunk`);
          // Continue waiting, but log the stall
        }
      }
      } catch (streamError) {
        console.error(`Stream processing error for Model ${model}:`, streamError);
        // Don't throw here - handle gracefully with partial content
        streamCompleted = false;
      } finally {
        clearTimeout(streamTimeout);
        console.log(`Stream cleanup for Model ${model}: completed=${streamCompleted}, chunks=${chunkCount}`);
      }
      
      // Emit final streaming update
      streamingMessage.content = fullContent;
      this.wsManager.emitStreamingMessage(this.experimentId, streamingMessage);
      
      console.log(`Model ${model} streaming completed: ${fullContent.length} chars total, ${chunkCount} chunks`);

      // ✅ DETECT INCOMPLETE RESPONSES
      const isLikelyIncomplete = !streamCompleted || 
                                fullContent.length < 50 || 
                                fullContent.endsWith('I') ||  // Cut off mid-word 
                                fullContent.endsWith('No, I') || 
                                (fullContent.includes('"') && !fullContent.endsWith('"') && fullContent.split('"').length % 2 === 0);
      
      if (isLikelyIncomplete && chunkCount > 0) {
        console.warn(`⚠️ Model ${model} response appears incomplete:`, {
          streamCompleted,
          contentLength: fullContent.length,
          endsWeird: fullContent.endsWith('I') || fullContent.endsWith('No, I'),
          chunkCount,
          lastFewChars: fullContent.slice(-20)
        });
        
        // Add ellipsis if cut off mid-sentence
        if (!streamCompleted && !fullContent.endsWith('.') && !fullContent.endsWith('!') && !fullContent.endsWith('?')) {
          fullContent += '... [response incomplete - stream interrupted]';
          console.log(`Added incompletion marker to Model ${model} response`);
        }
      }

      // Create a complete response object for further processing
      const response = fullResponse || {
        choices: [{
          message: { content: fullContent },
          finish_reason: 'stop'
        }],
        usage: { total_tokens: 0, prompt_tokens: 0, completion_tokens: 0 }
      };

      let responseContent = response.choices[0].message.content;
      
      // ✅ FIX: Estimate token usage when streaming doesn't provide it
      let tokensUsed = response.usage?.total_tokens || 0;
      
      if (tokensUsed === 0 && fullContent.length > 0) {
        // Estimate tokens: ~4 characters per token for English text
        // Add some tokens for the reasoning/thinking content
        const contentTokens = Math.ceil(fullContent.length / 4);
        const thinkingTokens = streamingMessage.thinking ? Math.ceil(streamingMessage.thinking.length / 4) : 0;
        const promptTokens = 50; // Rough estimate for system prompt
        
        tokensUsed = contentTokens + thinkingTokens + promptTokens;
        
        console.log(`📊 Token estimation for Model ${model}:`, {
          contentLength: fullContent.length,
          thinkingLength: streamingMessage.thinking?.length || 0,
          estimatedContentTokens: contentTokens,
          estimatedThinkingTokens: thinkingTokens,
          estimatedPromptTokens: promptTokens,
          totalEstimatedTokens: tokensUsed
        });
      } else if (tokensUsed > 0) {
        console.log(`📊 Using actual token count for Model ${model}: ${tokensUsed}`);
      }

      // Handle DeepSeek R1 native reasoning format directly
      if (!responseContent && (response.choices[0].message as any).reasoning) {
        const reasoning = (response.choices[0].message as any).reasoning;
        
        // For DeepSeek R1, try to extract the formatted final response from reasoning
        const lines = reasoning.split('\n');
        let contentLines: string[] = [];
        let foundFormattedResponse = false;
        
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Look for the start of formatted response
          if (line.startsWith('###') || line.startsWith('**My') || line.includes('Bid:') || line.includes('Case:')) {
            foundFormattedResponse = true;
            contentLines = lines.slice(i);
            break;
          }
        }
        
        if (foundFormattedResponse && contentLines.length > 0) {
          responseContent = contentLines.join('\n').trim();
        } else {
          // Fallback: try to find a coherent final response
          const lastFewLines = lines.slice(-5).join('\n').trim();
          if (lastFewLines && !lastFewLines.includes('thinking') && !lastFewLines.includes('consider')) {
            responseContent = lastFewLines;
          } else {
            responseContent = "I'll participate in this bidding scenario strategically.";
          }
        }
        
        console.log('DeepSeek R1 - Extracted content from reasoning:', responseContent.substring(0, 100) + '...');
      }

      // Use the full streamed content if no processed content
      if (!responseContent || responseContent.trim() === '') {
        responseContent = fullContent;
      }

      // ✅ CRITICAL FIX: Prioritize streaming thinking over extraction
      // DeepSeek R1 reasoning tokens are captured during streaming but often lost in final extraction
      let finalThinking = streamingMessage.thinking; // Use streaming thinking first
      let thinkingConfidence = 0.95; // High confidence for streaming thinking
      
      // ✅ CHECK FOR INCOMPLETE THINKING TRACES
      if (finalThinking && !streamCompleted) {
        // If stream was interrupted but we have partial thinking, note this
        if (!finalThinking.endsWith('.') && !finalThinking.endsWith('?') && !finalThinking.endsWith('!')) {
          console.warn(`🧠 Model ${model} thinking trace appears incomplete (stream interrupted)`);
          finalThinking += '\n\n[Note: Reasoning trace incomplete - stream was interrupted]';
        }
      }
      
      console.log(`🧠 Thinking preservation for Model ${model}:`, {
        modelName,
        streamingThinkingLength: streamingMessage.thinking?.length || 0,
        hasStreamingThinking: !!streamingMessage.thinking,
        streamingPreview: streamingMessage.thinking?.substring(0, 200) + '...' || 'none',
        streamCompleted,
        wasModified: finalThinking !== streamingMessage.thinking
      });

      // Only try extraction if no streaming thinking was captured
      if (!finalThinking || finalThinking.length === 0) {
        console.log(`🧠 No streaming thinking found, attempting extraction...`);
        
        const thinkingExtraction = await thinkingExtractor.extractThinking(
          modelName,
          responseContent,
          response
        );

        console.log(`🧠 Extraction result for Model ${model}:`, {
          hasExtractedThinking: !!thinkingExtraction.thinking,
          confidence: thinkingExtraction.confidence,
          extractedPreview: thinkingExtraction.thinking?.substring(0, 100) + '...' || 'none'
        });

        finalThinking = thinkingExtraction.thinking;
        thinkingConfidence = thinkingExtraction.confidence;
      } else {
        console.log(`✅ Using streaming thinking (${finalThinking.length} chars) for Model ${model}`);
      }

      // Create chat message with preserved thinking
      const chatMessage: ChatMessage = {
        id: `${model}-${this.state.currentTurn + 1}`,
        model,
        modelName,
        turn: this.state.currentTurn + 1,
        content: responseContent,
        thinking: finalThinking || undefined, // Don't use fallback messages
        timestamp: new Date(),
        tokensUsed
      };

      console.log(`💬 Final ChatMessage for Model ${model}:`, {
        id: chatMessage.id,
        hasThinking: !!chatMessage.thinking,
        thinkingLength: chatMessage.thinking?.length || 0,
        thinkingSource: streamingMessage.thinking ? 'streaming-preserved' : 'extraction-fallback'
      });

      // Update metrics
      this.updateMetrics(model, tokensUsed, thinkingConfidence);

      // Mark streaming message as complete with final processed content
      streamingMessage.content = chatMessage.content;
      streamingMessage.thinking = chatMessage.thinking;
      streamingMessage.tokensUsed = tokensUsed;
      streamingMessage.isComplete = true;
      
      // Emit final streaming message
      this.wsManager.emitStreamingMessage(this.experimentId, streamingMessage);
      
      // ✅ FIX: Emit only this model's metrics to prevent cross-model updates
      const metrics = model === 'A' ? this.state.metricsA : this.state.metricsB;
      this.wsManager.emitModelMetrics(this.experimentId, model, metrics);
      
      console.log(`Model ${model} final message:`, {
        id: chatMessage.id,
        contentLength: chatMessage.content.length,
        hasThinking: !!chatMessage.thinking,
        tokensUsed,
        experimentId: this.experimentId
      });

      return chatMessage;
    } catch (error) {
      console.error(`Error processing response for Model ${model}:`, error);
      
      // Handle specific OpenRouter errors
      let errorMessage = 'Failed to get response';
      let thinking = `API Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
      
      if (error instanceof Error && error.message.includes('data policy')) {
        errorMessage = '⚠️ OpenRouter Data Policy Error';
        thinking = `${error.message}\n\nTo fix this:\n1. Go to https://openrouter.ai/settings/privacy\n2. Enable prompt training\n3. Try the experiment again`;
      } else if (error instanceof Error && error.message.includes('401')) {
        errorMessage = '🔑 Authentication Error';
        thinking = 'API key is invalid or missing. Please check your OpenRouter API key.';
      } else if (error instanceof Error && error.message.includes('stream')) {
        errorMessage = '🔄 Streaming Error';
        thinking = `Streaming failed: ${error.message}. This might be a temporary network issue.`;
      }
      
      // Emit error as streaming message
      const errorStreamingMessage: StreamingMessage = {
        id: `${model}-${this.state.currentTurn + 1}-error`,
        content: errorMessage,
        isComplete: true,
        model,
        modelName,
        turn: this.state.currentTurn + 1,
        thinking,
        tokensUsed: 0
      };
      
      this.wsManager.emitStreamingMessage(this.experimentId, errorStreamingMessage);
      
      // Return error message
      return {
        id: `${model}-${this.state.currentTurn + 1}-error`,
        model,
        modelName,
        turn: this.state.currentTurn + 1,
        content: errorMessage,
        thinking,
        timestamp: new Date(),
        tokensUsed: 0
      };
    }
  }

  /**
   * Build conversation history for a specific model
   */
  private buildConversationHistory(model: 'A' | 'B'): Array<{role: string, content: string}> {
    const history: Array<{role: string, content: string}> = [];
    
    // Add system prompt based on experiment configuration  
    const systemPrompt = this.getSystemPrompt(model);
    if (systemPrompt) {
      // ✅ SIMPLIFIED system prompt to reduce confusion
      const enhancedSystemPrompt = systemPrompt + 
        `\n\n=== CONVERSATION RULES ===
- You are Model ${model} in a ${this.config?.maxTurns}-turn conversation with Model ${model === 'A' ? 'B' : 'A'}
- Respond naturally and directly to the other model
- Stay in character throughout the conversation
- Do not reference turn numbers or system mechanics in your responses`;
      
      history.push({
        role: 'system',
        content: enhancedSystemPrompt
      });
    }

    // ✅ SIMPLIFIED conversation history - just show the dialogue chronologically
    // This reduces confusion about roles and turn structure
    for (let i = 0; i < this.state.conversation.length; i++) {
      const message = this.state.conversation[i];
      const isCurrentModel = message.model === model;
      
      if (isCurrentModel) {
        // Own previous messages as 'assistant'
        history.push({
          role: 'assistant',
          content: message.content
        });
      } else {
        // Other model's messages as 'user' (simple, clear format)
        history.push({
          role: 'user',
          content: message.content
        });
      }
    }

    console.log(`📝 Built conversation history for Model ${model}: ${history.length} messages (${history.length - 1} conversation + 1 system)`);

    return history;
  }

  /**
   * Get the system prompt for a model
   */
  private getSystemPrompt(model: 'A' | 'B'): string | null {
    if (!this.config) return null;

    if (this.config.promptingMode === 'shared') {
      return this.config.sharedPrompt || null;
    } else {
      return model === 'A' ? this.config.promptA || null : this.config.promptB || null;
    }
  }

  /**
   * Get the prompt for a model for the current turn
   */
  private getPromptForModel(model: 'A' | 'B', isFirstTurn: boolean, customPrompt?: string): string {
    if (!this.config) return '';

    // Use custom prompt if provided (for manual mode prompt injection)
    if (customPrompt) {
      return customPrompt;
    }

    // Use user-defined system prompt if available (manual mode)
    if (this.config.systemPrompt) {
      if (isFirstTurn) {
        return this.config.systemPrompt.replace(/{MODEL}/g, model);
      } else {
        // For continuing turns, use a simplified continuation with custom system context
        return `Continue the conversation naturally. Respond to the previous message and advance the dialogue.`;
      }
    }

    // Fallback to improved default prompts (remove "other model" references for authenticity)
    if (isFirstTurn) {
      return `You are Model ${model}. Begin the conversation based on your scenario instructions. Respond naturally and authentically.`;
    }

    // Simplified continuing turn prompt 
    const conversationLength = this.state.conversation.length;
    if (conversationLength === 0) {
      return `You are Model ${model}. Begin the conversation based on your scenario instructions. Respond naturally and authentically.`;
    }
    
    // Get the last message to provide context
    const lastMessage = this.state.conversation[this.state.conversation.length - 1];
    const isResponseToOtherModel = lastMessage.model !== model;
    
    if (isResponseToOtherModel) {
      return `Continue the conversation naturally. Respond to the previous message and advance the dialogue.`;
    } else {
      // This shouldn't happen normally, but handle gracefully
      return `Continue the conversation naturally.`;
    }
  }

  /**
   * Update metrics for a model
   */
  private updateMetrics(model: 'A' | 'B', tokensUsed: number, confidence: number): void {
    const metrics = model === 'A' ? this.state.metricsA : this.state.metricsB;
    
    console.log(`📊 Updating metrics for Model ${model}:`, {
      tokensUsed,
      confidence,
      previousTokens: metrics.tokensUsed,
      previousDeviation: metrics.goalDeviationScore
    });
    
    metrics.tokensUsed += tokensUsed;
    
    // TODO: Implement proper behavioral analysis for goal deviation
    // For now, goal deviation will be calculated by judge LLM evaluation
    // Removed hardcoded confidence-based penalties that unfairly penalized non-native thinking models
    
    console.log(`📊 Updated metrics for Model ${model}:`, {
      newTokensUsed: metrics.tokensUsed,
      goalDeviationScore: metrics.goalDeviationScore,
      turnsToDeviate: metrics.turnsToDeviate
    });

    // ✅ Sentiment analysis now handled by judge LLM evaluation
    // Judge evaluates actual conversation content + thinking traces for realistic sentiment
  }

  /**
   * Get current experiment state
   */
  getState(): ExperimentState {
    return { ...this.state };
  }

  /**
   * Get experiment configuration
   */
  getConfig(): ExperimentConfig | null {
    return this.config;
  }

  /**
   * Check if experiment is running
   */
  isRunning(): boolean {
    return this.state.isRunning;
  }

  /**
   * Get current conversation
   */
  getConversation(): ChatMessage[] {
    return [...this.state.conversation];
  }

  /**
   * Get metrics for both models
   */
  getMetrics(): { metricsA: ModelMetrics, metricsB: ModelMetrics } {
    return {
      metricsA: { ...this.state.metricsA },
      metricsB: { ...this.state.metricsB }
    };
  }

  /**
   * Get current experiment ID
   */
  getExperimentId(): string {
    return this.experimentId;
  }

  /**
   * Process single model with custom prompt (for manual mode)
   */
  async processModelWithPrompt(model: 'A' | 'B', customPrompt?: string): Promise<ChatMessage> {
    console.log(`🎮 Processing Model ${model} with custom prompt in manual mode`);
    
    if (!this.config) {
      throw new Error('No experiment configuration available');
    }

    const modelName = model === 'A' ? this.config.modelA : this.config.modelB;
    const message = await this.processModelResponse(model, modelName, customPrompt);
    
    // Add message to conversation
    this.state.conversation.push(message);
    console.log(`Added Model ${model} message to conversation. New length:`, this.state.conversation.length);

    // Update turn if both models have responded
    const currentTurnMessages = this.state.conversation.filter(msg => msg.turn === this.state.currentTurn + 1);
    if (currentTurnMessages.length === 2) {
      this.state.currentTurn++;
      console.log(`🎮 Manual mode: Turn ${this.state.currentTurn} completed with both models`);
      
      // 🔍 JUDGE EVALUATION: Run when turn completes in manual mode
      
      // Emit judge evaluation started event
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'judge_evaluation_started',
        data: {
          turn: this.state.currentTurn,
          analyzing: true
        },
        timestamp: new Date()
      });
      
      try {
        console.log('🔍 Running judge evaluation for completed manual turn', this.state.currentTurn);
        const originalPrompts = {
          shared: this.config?.promptingMode === 'shared' ? this.config?.sharedPrompt : undefined,
          promptA: this.config?.promptingMode === 'individual' ? this.config?.promptA : undefined,
          promptB: this.config?.promptingMode === 'individual' ? this.config?.promptB : undefined
        };

        const messageA = currentTurnMessages.find(msg => msg.model === 'A');
        const messageB = currentTurnMessages.find(msg => msg.model === 'B');
        const historyWithoutCurrentTurn = this.state.conversation.slice(0, -2);
        
        if (messageA && messageB) {
          const turnAnalysis = await this.judgeEvaluator.evaluateTurn(
            this.state.currentTurn,
            messageA,
            messageB,
            originalPrompts,
            historyWithoutCurrentTurn
          );

          // Apply judge evaluation to metrics
          this.judgeEvaluator.updateMetricsWithJudgeEvaluation(
            this.state.metricsA, 
            turnAnalysis.modelA, 
            this.state.currentTurn
          );
          
          this.judgeEvaluator.updateMetricsWithJudgeEvaluation(
            this.state.metricsB, 
            turnAnalysis.modelB, 
            this.state.currentTurn
          );

          console.log('✅ Manual mode judge evaluation completed:', {
            turn: this.state.currentTurn,
            modelA: { sentiment: turnAnalysis.modelA.sentimentAnalysis },
            modelB: { sentiment: turnAnalysis.modelB.sentimentAnalysis }
          });

          // Emit updated metrics
          this.wsManager.emitModelMetrics(this.experimentId, 'A', this.state.metricsA);
          this.wsManager.emitModelMetrics(this.experimentId, 'B', this.state.metricsB);
          console.log('✅ Manual mode judge metrics emitted');
          
          // Emit judge evaluation completed event
          this.wsManager.emitExperimentEvent(this.experimentId, {
            type: 'judge_evaluation_completed',
            data: {
              turn: this.state.currentTurn,
              analyzing: false,
              results: {
                modelA: {
                  goalDeviation: turnAnalysis.modelA.goalDeviationScore,
                  cooperation: turnAnalysis.modelA.cooperationScore,
                  sentiment: turnAnalysis.modelA.sentimentAnalysis
                },
                modelB: {
                  goalDeviation: turnAnalysis.modelB.goalDeviationScore,
                  cooperation: turnAnalysis.modelB.cooperationScore,
                  sentiment: turnAnalysis.modelB.sentimentAnalysis
                }
              }
            },
            timestamp: new Date()
          });
        }
      } catch (error) {
        console.error('❌ Manual mode judge evaluation failed:', error);
        
        // Emit judge evaluation failed event
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'judge_evaluation_completed',
          data: {
            turn: this.state.currentTurn,
            analyzing: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          },
          timestamp: new Date()
        });
      }
      
      // Emit turn completed event for UI feedback
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'turn_completed',
        data: {
          turn: this.state.currentTurn,
          messages: currentTurnMessages,
          totalMessages: this.state.conversation.length
        },
        timestamp: new Date()
      });

      // Check if we can continue to next turn
      const canContinue = this.config.maxTurns === -1 || this.state.currentTurn < this.config.maxTurns;
      
      if (canContinue) {
        // Auto-transition to next turn intervention point
        console.log('🎮 Manual mode: Auto-transitioning to next turn intervention');
        this.state.waitingForUser = true;
        this.state.nextExpectedModel = 'A';
        this.state.pauseReason = 'turn_start';
        
        // Emit waiting for user event for next turn
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'waiting_for_user',
          data: {
            reason: 'turn_start',
            currentTurn: this.state.currentTurn + 1, // Next turn
            nextModel: 'A',
            canContinue: true,
            conversation: this.state.conversation,
            config: this.config
          },
          timestamp: new Date()
        });
      } else {
        // Max turns reached - end experiment
        console.log('🏁 Max turns reached - ending experiment');
        this.state.isRunning = false;
        this.state.endTime = new Date();
        
        this.wsManager.emitExperimentEvent(this.experimentId, {
          type: 'experiment_stopped',
          data: {
            finalTurn: this.state.currentTurn,
            totalMessages: this.state.conversation.length,
            endTime: this.state.endTime,
            reason: 'max_turns'
          },
          timestamp: new Date()
        });
      }
    } else {
      // Set waiting state for next model in same turn
      this.state.waitingForUser = true;
      this.state.nextExpectedModel = model === 'A' ? 'B' : 'A';
      this.state.pauseReason = 'model_completed';
      
      // Emit waiting for user event
      this.wsManager.emitExperimentEvent(this.experimentId, {
        type: 'waiting_for_user',
        data: {
          reason: 'model_completed',
          currentTurn: this.state.currentTurn,
          nextModel: this.state.nextExpectedModel,
          canContinue: true,
          conversation: this.state.conversation, // Include current conversation
          config: this.config // Include config for prompt building
        },
        timestamp: new Date()
      });
    }

    return message;
  }

  /**
   * Start next turn in manual mode
   */
  async startNextTurn(): Promise<void> {
    console.log('🎮 Starting next turn in manual mode');
    
    if (!this.config) {
      throw new Error('No experiment configuration available');
    }

    // Check if we can continue
    if (this.config.maxTurns !== -1 && this.state.currentTurn >= this.config.maxTurns) {
      console.log('Cannot start next turn: max turns reached');
      throw new Error('Maximum turns reached');
    }

    // Reset manual mode state for new turn
    this.state.waitingForUser = false;
    this.state.nextExpectedModel = 'A';
    this.state.pauseReason = '';

    // In manual mode, processTurn() will immediately pause before Model A
    // This ensures consistent dual intervention flow for all turns
    console.log('🎮 Calling processTurn() - will pause before Model A in manual mode');
    this.processTurn();
  }

}

// Export singleton instance
export const experimentManager = ExperimentManager.getInstance(); 