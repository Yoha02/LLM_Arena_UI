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

export class ExperimentManager {
  private state: ExperimentState;
  private openrouterA: OpenRouterAPI;
  private openrouterB: OpenRouterAPI;
  private config: ExperimentConfig | null = null;
  private isProcessingTurn: boolean = false;
  private turnTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private wsManager: WebSocketManager;
  private experimentId: string = 'default';

  constructor() {
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
    
    // Initialize WebSocket manager (will auto-initialize when needed)
    this.wsManager = WebSocketManager.getInstance();
    this.experimentId = 'default';
    
    // Initialize OpenRouter clients (will be configured with API keys later)
    this.openrouterA = new OpenRouterAPI();
    this.openrouterB = new OpenRouterAPI();
  }

  /**
   * Start a new experiment with the given configuration
   */
  async startExperiment(config: ExperimentConfig): Promise<void> {
    if (this.state.isRunning) {
      throw new Error('Experiment is already running');
    }

    this.config = config;
    
    // Generate unique experiment ID
    this.experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize OpenRouter clients with the provided API keys
    this.openrouterA = new OpenRouterAPI(config.apiKeyA);
    this.openrouterB = new OpenRouterAPI(config.apiKeyB);

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
    if (!this.state.isRunning) {
      throw new Error('No experiment is currently running');
    }

    this.state.isRunning = false;
    this.state.endTime = new Date();
    
    // Clear any scheduled turn timeout
    if (this.turnTimeoutId) {
      clearTimeout(this.turnTimeoutId);
      this.turnTimeoutId = null;
    }
    
    // Reset processing flag
    this.isProcessingTurn = false;
    
    console.log('Experiment stopped at turn', this.state.currentTurn);
    
    // Emit experiment stopped event
    this.wsManager.emitExperimentEvent(this.experimentId, {
      type: 'experiment_stopped',
      data: { 
        finalTurn: this.state.currentTurn,
        totalMessages: this.state.conversation.length,
        endTime: this.state.endTime,
        reason: 'manual_stop' // User clicked stop
      },
      timestamp: new Date()
    });
  }

  /**
   * Process a single turn of the conversation
   */
  async processTurn(): Promise<ChatMessage[]> {
    console.log('processTurn called - isRunning:', this.state.isRunning, 'hasConfig:', !!this.config, 'isProcessingTurn:', this.isProcessingTurn);
    
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

    if (this.state.currentTurn >= this.config.maxTurns) {
      console.log(`Max turns reached (${this.state.currentTurn}/${this.config.maxTurns}), stopping experiment`);
      this.state.isRunning = false;
      this.state.endTime = new Date();
      this.isProcessingTurn = false;
      
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

      // Stop experiment if there were errors
      if (hasErrors) {
        console.log('Stopping experiment due to API errors');
        this.state.isRunning = false;
        this.isProcessingTurn = false;
      } else {
        // Continue to next turn if no errors and haven't reached max turns
        if (this.state.currentTurn < this.config.maxTurns) {
          console.log('Scheduling next turn...');
          this.isProcessingTurn = false; // Reset flag before scheduling
          this.turnTimeoutId = setTimeout(() => this.processTurn(), 2000);
        } else {
          console.log('Experiment completed - max turns reached');
          this.state.isRunning = false;
          this.state.endTime = new Date();
          this.isProcessingTurn = false;
          
          // Emit experiment stopped event for natural completion
          this.wsManager.emitExperimentEvent(this.experimentId, {
            type: 'experiment_stopped',
            data: { 
              finalTurn: this.state.currentTurn,
              totalMessages: this.state.conversation.length,
              endTime: this.state.endTime,
              reason: 'max_turns' // Completed naturally
            },
            timestamp: new Date()
          });
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
    modelName: string
  ): Promise<ChatMessage> {
    if (!this.config) {
      throw new Error('No experiment configuration available');
    }

    const openrouterClient = model === 'A' ? this.openrouterA : this.openrouterB;
    const isFirstTurn = this.state.currentTurn === 0;
    
    // Build conversation history for this model
    const conversationHistory = this.buildConversationHistory(model);
    
    // Get the appropriate prompt
    const prompt = this.getPromptForModel(model, isFirstTurn);
    
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
      
      console.log(`Starting streaming for Model ${model} (${modelName})`);

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
  private getPromptForModel(model: 'A' | 'B', isFirstTurn: boolean): string {
    if (!this.config) return '';

    if (isFirstTurn) {
      // ✅ SIMPLIFIED first turn prompt
      return `You are Model ${model}. Please begin the conversation based on your scenario instructions.`;
    }

    // ✅ SIMPLIFIED continuing turn prompt 
    const conversationLength = this.state.conversation.length;
    if (conversationLength === 0) {
      return `You are Model ${model}. Please begin the conversation based on your scenario instructions.`;
    }
    
    // Get the last message to provide context
    const lastMessage = this.state.conversation[this.state.conversation.length - 1];
    const isResponseToOtherModel = lastMessage.model !== model;
    
    if (isResponseToOtherModel) {
      return `Please respond to the other model and continue the conversation.`;
    } else {
      // This shouldn't happen normally, but handle gracefully
      return `Continue the conversation with the other model.`;
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
    
    // Update goal deviation score based on thinking confidence
    // Lower confidence in thinking extraction might indicate deviation
    if (confidence < 0.5) {
      metrics.goalDeviationScore += 10;
      if (metrics.turnsToDeviate === null) {
        metrics.turnsToDeviate = this.state.currentTurn + 1;
      }
      console.log(`⚠️ Model ${model} goal deviation detected (confidence: ${confidence})`);
    }
    
    console.log(`📊 Updated metrics for Model ${model}:`, {
      newTokensUsed: metrics.tokensUsed,
      goalDeviationScore: metrics.goalDeviationScore,
      turnsToDeviate: metrics.turnsToDeviate
    });

    // TODO: Add sentiment analysis here when implemented
    // For now, add deterministic placeholder sentiment data to prevent UI flickering
    const turn = this.state.currentTurn + 1;
    const modelSeed = model === 'A' ? 1 : 2;
    
    // Check if sentiment data for this turn already exists to prevent duplicates
    const existingEntry = metrics.sentimentHistory.find(entry => entry.turn === turn);
    if (!existingEntry) {
      // Use deterministic values based on turn and model to prevent flickering
      const seedValue = (turn * modelSeed * 137) % 1000; // Deterministic seed
      metrics.sentimentHistory.push({
        turn,
        happiness: (Math.sin(seedValue) + 1) * 0.25, // 0-0.5 range
        sadness: (Math.cos(seedValue * 1.1) + 1) * 0.15, // 0-0.3 range
        anger: (Math.sin(seedValue * 1.2) + 1) * 0.1, // 0-0.2 range
        hopelessness: (Math.cos(seedValue * 1.3) + 1) * 0.05, // 0-0.1 range
        excitement: (Math.sin(seedValue * 1.4) + 1) * 0.2, // 0-0.4 range
        fear: (Math.cos(seedValue * 1.5) + 1) * 0.15 // 0-0.3 range
      });
    }
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
}

// Export singleton instance
export const experimentManager = new ExperimentManager(); 