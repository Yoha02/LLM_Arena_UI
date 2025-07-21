import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function GET(request: NextRequest) {
  try {
    const state = experimentManager.getState();
    const config = experimentManager.getConfig();
    
    return NextResponse.json({
      status: 'success',
      timestamp: new Date().toISOString(),
      experiment: {
        isRunning: state.isRunning,
        currentTurn: state.currentTurn,
        maxTurns: config?.maxTurns || 0,
        startTime: state.startTime,
        endTime: state.endTime,
        progress: config?.maxTurns ? (state.currentTurn / config.maxTurns) * 100 : 0,
        conversation: state.conversation,
        metricsA: state.metricsA,
        metricsB: state.metricsB,
        config: config ? {
          promptingMode: config.promptingMode,
          sharedPrompt: config.sharedPrompt,
          promptA: config.promptA,
          promptB: config.promptB,
          maxTurns: config.maxTurns,
          modelA: config.modelA,
          modelB: config.modelB,
          // Don't return API keys
          apiKeyA: '***',
          apiKeyB: '***'
        } : null
      }
    });
  } catch (error) {
    console.error('Get experiment status error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to get experiment status',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// POST endpoint to process next turn
export async function POST(request: NextRequest) {
  try {
    // Check if experiment is running
    if (!experimentManager.isRunning()) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'No experiment is currently running',
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      );
    }

    // Process the next turn
    const turnMessages = await experimentManager.processTurn();
    
    // Get updated state
    const state = experimentManager.getState();
    
    return NextResponse.json({
      status: 'success',
      message: 'Turn processed successfully',
      timestamp: new Date().toISOString(),
      turn: {
        turnNumber: state.currentTurn,
        messages: turnMessages,
        isExperimentComplete: !state.isRunning,
        totalMessages: state.conversation.length
      },
      state: {
        isRunning: state.isRunning,
        currentTurn: state.currentTurn,
        progress: experimentManager.getConfig() ? 
          (state.currentTurn / experimentManager.getConfig()!.maxTurns) * 100 : 0,
        metricsA: state.metricsA,
        metricsB: state.metricsB
      }
    });
  } catch (error) {
    console.error('Process turn error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to process turn',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 