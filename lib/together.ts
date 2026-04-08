import OpenAI from 'openai';
import { ModelConfig } from './types';

export function createTogetherClient(apiKey?: string): OpenAI {
  return new OpenAI({
    baseURL: 'https://api.together.xyz/v1',
    apiKey: apiKey || process.env.TOGETHER_API_KEY || '',
    timeout: 120000,
    maxRetries: 2,
  });
}

export const TOGETHER_MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Internal Together mapping targets (not exposed as separate UI models)
  'deepseek-r1': { name: 'DeepSeek R1 0528', openrouterName: 'deepseek-ai/DeepSeek-R1-0528', maxTokens: 8192, supportsNativeThinking: true, thinkingExtractionMethod: 'native' },
  'deepseek-v3': { name: 'DeepSeek V3.1', openrouterName: 'deepseek-ai/DeepSeek-V3.1', maxTokens: 4096, supportsNativeThinking: false, thinkingExtractionMethod: 'chain-of-thought' },
  'deepseek-v3.2': { name: 'DeepSeek V3.2', openrouterName: 'deepseek-ai/DeepSeek-V3.2', maxTokens: 8192, supportsNativeThinking: false, thinkingExtractionMethod: 'chain-of-thought' },
  'qwen3-235b': { name: 'Qwen3 235B A22B', openrouterName: 'Qwen/Qwen3-235B-A22B-fp8', maxTokens: 4096, supportsNativeThinking: true, thinkingExtractionMethod: 'chain-of-thought' },
  'llama-405b': { name: 'Llama 3.1 405B Instruct', openrouterName: 'meta-llama/llama-3.1-405b-instruct', maxTokens: 4096, supportsNativeThinking: false, thinkingExtractionMethod: 'structured' },
  'llama-3.3-70b': { name: 'Llama 3.3 70B Instruct Turbo', openrouterName: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', maxTokens: 4096, supportsNativeThinking: false, thinkingExtractionMethod: 'chain-of-thought' },
  'kimi-k2-thinking': { name: 'Kimi K2 Thinking', openrouterName: 'moonshotai/kimi-k2-thinking', maxTokens: 4096, supportsNativeThinking: true, thinkingExtractionMethod: 'chain-of-thought' },
  'minimax-m2': { name: 'MiniMax M2', openrouterName: 'MiniMaxAI/MiniMax-M2', maxTokens: 4096, supportsNativeThinking: true, thinkingExtractionMethod: 'chain-of-thought' },
  'glm-4.7': { name: 'GLM 4.7', openrouterName: 'zai-org/GLM-4.7', maxTokens: 4096, supportsNativeThinking: true, thinkingExtractionMethod: 'chain-of-thought' },
  'gemma-3-27b': { name: 'Gemma 3 27B Instruct', openrouterName: 'google/gemma-3-27b-it', maxTokens: 4096, supportsNativeThinking: false, thinkingExtractionMethod: 'chain-of-thought' },
  'gpt-oss-120b': { name: 'GPT OSS 120B', openrouterName: 'openai/gpt-oss-120b', maxTokens: 4096, supportsNativeThinking: true, thinkingExtractionMethod: 'chain-of-thought' },
  'gpt-oss-20b': { name: 'GPT OSS 20B', openrouterName: 'openai/gpt-oss-20b', maxTokens: 4096, supportsNativeThinking: true, thinkingExtractionMethod: 'chain-of-thought' },
};

export function hasTogetherEquivalentModel(model: string): boolean {
  return Boolean(TOGETHER_MODEL_CONFIGS[model]);
}

/**
 * For models with no Together mapping, suggest a close substitute that does support
 * our logprobs path (heuristic — same list as MODEL_CONFIGS ids).
 */
export const LOGPROBS_CLOSEST_ALTERNATIVE_ID: Partial<Record<string, string>> = {
  'phi-4': 'llama-3.3-70b',
  'minimax-m2.1': 'minimax-m2',
  'gemini-3-pro-preview': 'qwen3-235b',
  'gemini-3-flash-preview': 'llama-3.3-70b',
  'gpt-oss-safeguard-20b': 'gpt-oss-20b',
  'gpt-4-turbo': 'gpt-oss-120b',
  'claude-3-opus': 'deepseek-r1',
};

function resolveTogetherModelName(model: string): string {
  const config = TOGETHER_MODEL_CONFIGS[model];
  if (!config) {
    throw new Error(`No Together equivalent configured for model: ${model}`);
  }
  return config.openrouterName;
}

export class TogetherAPI {
  private client: OpenAI;

  constructor(apiKey?: string) {
    this.client = createTogetherClient(apiKey);
  }

  async streamChatCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      logprobs?: boolean;
      topLogprobs?: number;
    } = {}
  ): Promise<any> {
    const modelConfig = TOGETHER_MODEL_CONFIGS[model];
    if (!modelConfig) {
      throw new Error(`Unknown Together model: ${model}`);
    }

    const requestBody: any = {
      model: modelConfig.openrouterName,
      messages,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature ?? 0.7,
      stream: true,
    };

    if (options.logprobs) {
      requestBody.logprobs = 1;
      requestBody.top_logprobs = options.topLogprobs || 5;
    }

    const stream = await this.client.chat.completions.create(requestBody);
    return stream;
  }

  async chatCompletion(
    model: string,
    messages: Array<{ role: string; content: string }>,
    options: {
      maxTokens?: number;
      temperature?: number;
      logprobs?: boolean;
      topLogprobs?: number;
    } = {}
  ): Promise<any> {
    const modelConfig = TOGETHER_MODEL_CONFIGS[model];
    if (!modelConfig) {
      throw new Error(`Unknown Together model: ${model}`);
    }

    const requestBody: any = {
      model: resolveTogetherModelName(model),
      messages,
      max_tokens: options.maxTokens || modelConfig.maxTokens,
      temperature: options.temperature ?? 0.7,
      stream: false,
    };

    if (options.logprobs) {
      requestBody.logprobs = 1;
      requestBody.top_logprobs = options.topLogprobs || 5;
    }

    return await this.client.chat.completions.create(requestBody);
  }
}

export function createTogetherAPI(apiKey?: string): TogetherAPI {
  return new TogetherAPI(apiKey);
}
