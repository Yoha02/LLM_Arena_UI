import { MODEL_CONFIGS } from './openrouter';
import { TOGETHER_MODEL_CONFIGS } from './together';
import { ModelConfig } from './types';

export type ModelProvider = 'openrouter' | 'together';

export interface RegisteredModel {
  id: string;
  provider: ModelProvider;
  config: ModelConfig;
}

export const REGISTERED_MODELS: Record<string, RegisteredModel> = {
  ...Object.fromEntries(
    Object.entries(MODEL_CONFIGS).map(([id, config]) => [id, { id, provider: 'openrouter' as const, config }])
  ),
  ...Object.fromEntries(
    Object.entries(TOGETHER_MODEL_CONFIGS).map(([id, config]) => [id, { id, provider: 'together' as const, config }])
  ),
};

export function getRegisteredModel(modelId: string): RegisteredModel | undefined {
  return REGISTERED_MODELS[modelId];
}

export function isTogetherModel(modelId: string): boolean {
  return REGISTERED_MODELS[modelId]?.provider === 'together';
}

export function listRegisteredModels(): RegisteredModel[] {
  return Object.values(REGISTERED_MODELS);
}
