import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Test the exact same flow as the UI
    const config = {
      promptingMode: body.promptingMode || 'shared',
      sharedPrompt: body.sharedPrompt || 'Test',
      promptA: body.promptA || null,
      promptB: body.promptB || null,
      maxTurns: body.maxTurns || 1,
      modelA: body.modelA || 'gpt-4-turbo',
      modelB: body.modelB || 'gpt-4-turbo',
      apiKeyA: body.apiKeyA,
      apiKeyB: body.apiKeyB
    };

    console.log('TEST: Starting experiment with config:', config);

    // Start experiment
    await experimentManager.startExperiment(config);
    
    // Get state immediately after
    const state = experimentManager.getState();
    
    console.log('TEST: State after experiment start:', {
      isRunning: state.isRunning,
      currentTurn: state.currentTurn,
      conversationLength: state.conversation?.length || 0,
      error: state.error
    });

    return NextResponse.json({
      status: 'success',
      message: 'Experiment test completed',
      result: {
        isRunning: state.isRunning,
        currentTurn: state.currentTurn,
        messageCount: state.conversation?.length || 0,
        error: state.error,
        messages: state.conversation?.map(m => ({
          id: m.id,
          model: m.model,
          content: m.content?.substring(0, 100) + '...',
          hasContent: !!m.content
        })) || []
      }
    });

  } catch (error) {
    console.error('TEST: Experiment test failed:', error);
    return NextResponse.json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 