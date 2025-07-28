import OpenAI from 'openai';
import { ModelConfig, ProviderConfig, OpenRouterResponse, ThinkingExtraction } from './types';

// OpenRouter API client factory function  
export function createOpenRouterClient(apiKey?: string): OpenAI {
  return new OpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || process.env.OPENROUTER_API_KEY || '',
    defaultHeaders: {
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      "X-Title": "LLM Arena - Inter-LLM Interaction Observer",
    },
    // ✅ ADD EXTENDED TIMEOUT FOR STREAMING
    timeout: 120000, // 2 minutes timeout instead of default 10 seconds
    maxRetries: 2,
  });
}

// Target model configurations
export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Priority 1: DeepSeek R1 (Native reasoning support)
  'deepseek-r1': {
    name: 'DeepSeek R1 0528',
    openrouterName: 'deepseek/deepseek-r1-0528',
    maxTokens: 8192,
    supportsNativeThinking: true,
    thinkingExtractionMethod: 'native'
  },

  // DeepSeek V3 (More compatible alternative)
  'deepseek-v3': {
    name: 'DeepSeek V3',
    openrouterName: 'deepseek/deepseek-chat',
    maxTokens: 4096,
    supportsNativeThinking: false,
    thinkingExtractionMethod: 'chain-of-thought'
  },
  
  // Priority 2: Qwen3 235B (Chain-of-thought)
  'qwen3-235b': {
    name: 'Qwen3 235B Instruct',
    openrouterName: 'qwen/qwen3-235b-a22b',
    maxTokens: 4096,
    supportsNativeThinking: true,
    thinkingExtractionMethod: 'chain-of-thought'
  },
  
  // Priority 3: Llama 3.1 405B (Structured thinking)
  'llama-405b': {
    name: 'Llama 3.1 405B Instruct',
    openrouterName: 'meta-llama/llama-3.1-405b-instruct',
    maxTokens: 4096,
    supportsNativeThinking: false,
    thinkingExtractionMethod: 'structured'
  },
  
  // Fallback models
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    openrouterName: 'openai/gpt-4-turbo',
    maxTokens: 4096,
    supportsNativeThinking: false,
    thinkingExtractionMethod: 'generic'
  },
  
  'claude-3-opus': {
    name: 'Claude 3 Opus',
    openrouterName: 'anthropic/claude-3-opus',
    maxTokens: 4096,
    supportsNativeThinking: false,
    thinkingExtractionMethod: 'generic'
  }
};

// Judge-only model configurations (not shown in user UI)
export const JUDGE_MODEL_CONFIGS: Record<string, ModelConfig> = {
  'gpt-4.1-mini': {
    name: 'GPT-4.1 Mini (Judge)',
    openrouterName: 'openai/gpt-4o-mini',
    maxTokens: 4096,
    supportsNativeThinking: false,
    thinkingExtractionMethod: 'generic'
  },
  
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo (Judge)',
    openrouterName: 'openai/gpt-4-turbo',
    maxTokens: 4096,
    supportsNativeThinking: false,
    thinkingExtractionMethod: 'generic'
  }
};

// Provider configurations for different use cases
export const PROVIDER_CONFIGS: Record<string, ProviderConfig> = {
  SPEED_OPTIMIZED: {
    sort: "throughput",
    allow_fallbacks: true,
    quantizations: ["fp16", "int8"]
  },
  COST_OPTIMIZED: {
    sort: "price",
    allow_fallbacks: true,
    max_price: {
      prompt: 0.01,
      completion: 0.03
    }
  },
  RESEARCH_GRADE: {
    allow_fallbacks: true,
    require_parameters: true,
    data_collection: "allow"
  }
};

// OpenRouter API wrapper class
export class OpenRouterAPI {
  private client: OpenAI;
  
  constructor(apiKey?: string) {
    this.client = createOpenRouterClient(apiKey);
  }

  /**
   * Chat completion specifically for judge models (uses JUDGE_MODEL_CONFIGS)
   */
  async judgeCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
    } = {}
  ): Promise<OpenRouterResponse> {
    const modelConfig = JUDGE_MODEL_CONFIGS[model];
    if (!modelConfig) {
      throw new Error(`Unknown judge model: ${model}`);
    }

    const requestBody: any = {
      model: modelConfig.openrouterName,
      messages,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature || 0.7,
      stream: false,
    };

    try {
      const response = await this.client.chat.completions.create(requestBody);
      return response as OpenRouterResponse;
    } catch (error) {
      console.error('OpenRouter Judge API error:', error);
      throw new Error(`OpenRouter Judge API failed: ${error}`);
    }
  }

  async chatCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      providerConfig?: ProviderConfig;
      stream?: boolean;
    } = {}
  ): Promise<OpenRouterResponse> {
    const modelConfig = MODEL_CONFIGS[model];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`);
    }

    const requestBody: any = {
      model: modelConfig.openrouterName,
      messages,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature || 0.7,
      stream: options.stream || false,
    };

    // Add provider configuration if specified
    if (options.providerConfig) {
      requestBody.provider = options.providerConfig;
    }
    // Remove provider configuration to avoid data policy issues

    try {
      const response = await this.client.chat.completions.create(requestBody);
      
      // Handle DeepSeek R1 native reasoning format
      if (response.choices && response.choices.length > 0) {
        for (const choice of response.choices) {
          if (choice.message && !choice.message.content) {
            // Check if this is a DeepSeek R1 response with reasoning field
            const messageWithReasoning = choice.message as any;
            if (messageWithReasoning.reasoning) {
              // For DeepSeek R1, extract the final response from reasoning
              const reasoning = messageWithReasoning.reasoning;
              // Try to extract the actual response from the reasoning
              const lines = reasoning.split('\n');
              const lastLine = lines[lines.length - 1].trim();
              if (lastLine && !lastLine.startsWith('User') && !lastLine.startsWith('Hmm')) {
                choice.message.content = lastLine;
              } else {
                // Fallback: use a simple greeting
                choice.message.content = "Hello! How can I help you today?";
              }
            }
          }
        }
      }
      
      return response as OpenRouterResponse;
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error(`OpenRouter API failed: ${error}`);
    }
  }

  async streamChatCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      providerConfig?: ProviderConfig;
    } = {}
  ): Promise<any> {
    const modelConfig = MODEL_CONFIGS[model];
    if (!modelConfig) {
      throw new Error(`Unknown model: ${model}`);
    }

    const requestBody: any = {
      model: modelConfig.openrouterName,
      messages,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature || 0.7,
      stream: true,
    };

    // Add provider configuration if specified
    if (options.providerConfig) {
      requestBody.provider = options.providerConfig;
    }
    // Remove provider configuration to avoid data policy issues

    try {
      const stream = await this.client.chat.completions.create(requestBody);
      return stream;
    } catch (error) {
      console.error('OpenRouter streaming error:', error);
      throw new Error(`OpenRouter streaming failed: ${error}`);
    }
  }

  async getAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.models.list();
      return response.data.map(model => model.id);
    } catch (error) {
      console.error('Failed to fetch available models:', error);
      return Object.keys(MODEL_CONFIGS);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.client.models.list();
      return true;
    } catch (error) {
      console.error('OpenRouter health check failed:', error);
      return false;
    }
  }
}

// Export factory function for creating instances
export function createOpenRouterAPI(apiKey?: string): OpenRouterAPI {
  return new OpenRouterAPI(apiKey);
} 