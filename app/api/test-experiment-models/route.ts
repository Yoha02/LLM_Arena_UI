import { NextRequest, NextResponse } from 'next/server';
import { OpenRouterAPI } from '@/lib/openrouter';

export async function GET(request: NextRequest) {
  try {
    const openrouter = new OpenRouterAPI();

    // Test the exact models used in the experiment
    const testMessages = [
      { role: 'user', content: 'Hello, please respond with a brief greeting.' }
    ];

    // Test DeepSeek R1 with full response debugging
    let deepseekResult = null;
    try {
      const deepseekResponse = await openrouter.chatCompletion(
        'deepseek-r1',
        testMessages,
        { maxTokens: 100 }
      );
      deepseekResult = {
        success: true,
        content: deepseekResponse.choices[0]?.message?.content || 'Empty response',
        usage: deepseekResponse.usage,
        // Debug info
        fullMessage: deepseekResponse.choices[0]?.message,
        allChoices: deepseekResponse.choices,
        rawResponse: deepseekResponse
      };
    } catch (error) {
      deepseekResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    // Test GPT-4 Turbo (working baseline)
    let gpt4Result = null;
    try {
      const gpt4Response = await openrouter.chatCompletion(
        'gpt-4-turbo',
        testMessages,
        { maxTokens: 100 }
      );
      gpt4Result = {
        success: true,
        content: gpt4Response.choices[0]?.message?.content || 'Empty response',
        usage: gpt4Response.usage
      };
    } catch (error) {
      gpt4Result = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      results: {
        'deepseek-r1': deepseekResult,
        'gpt-4-turbo': gpt4Result
      }
    });

  } catch (error) {
    console.error('Model test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      status: 'error'
    }, { status: 500 });
  }
} 