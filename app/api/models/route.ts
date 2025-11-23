import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterAPI, MODEL_CONFIGS } from '@/lib/openrouter';

// Force dynamic rendering since this route makes external API calls
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const includeAvailable = searchParams.get('available') === 'true';
    
    // Get our configured models
    const configuredModels = Object.entries(MODEL_CONFIGS).map(([key, config]) => ({
      id: key,
      name: config.name,
      openrouterName: config.openrouterName,
      maxTokens: config.maxTokens,
      supportsNativeThinking: config.supportsNativeThinking,
      thinkingExtractionMethod: config.thinkingExtractionMethod,
      priority: key.includes('deepseek') ? 1 : 
                key.includes('qwen') || key.includes('kimi') ? 2 : 
                key.includes('llama') ? 3 : 4
    }));

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