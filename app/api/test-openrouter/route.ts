import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterAPI } from '@/lib/openrouter';

export async function GET(request: NextRequest) {
  try {
    const openrouter = new OpenRouterAPI();

    // Test basic connectivity
    const healthCheck = await openrouter.healthCheck();
    
    if (!healthCheck) {
      return NextResponse.json({
        error: 'OpenRouter API health check failed',
        status: 'error'
      }, { status: 500 });
    }

    // Test a simple DeepSeek R1 request
    const testMessages = [
      { role: 'user', content: 'Say hello in one sentence.' }
    ];

    // Try with a more basic model first
    const response = await openrouter.chatCompletion(
      'gpt-4-turbo',
      testMessages,
      { maxTokens: 100 }
    );

    return NextResponse.json({
      status: 'success',
      healthCheck: true,
      testResponse: {
        model: 'gpt-4-turbo',
        content: response.choices[0]?.message?.content,
        usage: response.usage,
        success: !!response.choices[0]?.message?.content
      }
    });

  } catch (error) {
    console.error('OpenRouter test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 