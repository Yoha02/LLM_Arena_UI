import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterAPI, MODEL_CONFIGS } from '@/lib/openrouter';
import { hasTogetherEquivalentModel, LOGPROBS_CLOSEST_ALTERNATIVE_ID } from '@/lib/together';

// Force dynamic rendering since this route makes external API calls
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const includeAvailable = searchParams.get('available') === 'true';
    
    // Single model list for UI; provider is selected at runtime in StarChamber
    const configuredModels = Object.entries(MODEL_CONFIGS).map(([id, config]) => {
      const supportsLogprobs = hasTogetherEquivalentModel(id);
      const altId = !supportsLogprobs ? LOGPROBS_CLOSEST_ALTERNATIVE_ID[id] : undefined;
      const altConfig = altId ? MODEL_CONFIGS[altId] : undefined;
      return {
        id,
        name: config.name,
        provider: 'openrouter',
        openrouterName: config.openrouterName,
        maxTokens: config.maxTokens,
        supportsNativeThinking: config.supportsNativeThinking,
        supportsLogprobs,
        logprobsAlternativeId: altId ?? null,
        logprobsAlternativeName: altConfig?.name ?? null,
        thinkingExtractionMethod: config.thinkingExtractionMethod,
        priority: id.includes('deepseek') ? 1 : 
                  id.includes('qwen') || id.includes('kimi') || id.includes('minimax') || id.includes('glm') ? 2 : 
                  id.includes('gemini') ? 2 :
                  id.includes('llama') ? 3 : 4
      };
    });

    let response: any = {
      status: 'success',
      timestamp: new Date().toISOString(),
      models: configuredModels.sort((a, b) => a.priority - b.priority)
    };

    // Optionally check which models are actually available on OpenRouter
    if (includeAvailable) {
      try {
        const openrouterAPI = createOpenRouterAPI();
        const availableModels = await openrouterAPI.getAvailableModels();
        response.availability = configuredModels.map(model => ({
          id: model.id,
          available: availableModels.includes(model.openrouterName)
        }));
      } catch (error) {
        console.error('Failed to check model availability:', error);
        response.availability = configuredModels.map(model => ({
          id: model.id,
          available: null, // Unknown
          error: 'Failed to check availability'
        }));
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Models API error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to fetch models',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 