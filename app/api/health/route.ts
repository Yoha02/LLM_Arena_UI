import { NextRequest, NextResponse } from 'next/server';
import { createOpenRouterAPI } from '@/lib/openrouter';

export async function GET(request: NextRequest) {
  try {
    // Check OpenRouter connectivity
    const openrouterAPI = createOpenRouterAPI();
    const isHealthy = await openrouterAPI.healthCheck();
    
    if (!isHealthy) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'OpenRouter API is not accessible',
          timestamp: new Date().toISOString()
        },
        { status: 503 }
      );
    }

    // Check environment variables
    const hasOpenRouterKey = !!process.env.OPENROUTER_API_KEY;
    const hasOpenAIKey = !!process.env.OPENAI_API_KEY;

    return NextResponse.json({
      status: 'healthy',
      message: 'LLM Arena backend is operational',
      timestamp: new Date().toISOString(),
      services: {
        openrouter: isHealthy,
        openai: hasOpenAIKey,
        environment: hasOpenRouterKey
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Health check failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 