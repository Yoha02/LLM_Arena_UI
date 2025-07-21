import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

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
        { status: 400 }
      );
    }

    // Process the next turn
    const newMessages = await experimentManager.processTurn();
    const state = experimentManager.getState();

    return NextResponse.json({
      status: 'success',
      message: 'Turn processed successfully',
      timestamp: new Date().toISOString(),
      turn: state.currentTurn,
      newMessages,
      conversation: state.conversation,
      isComplete: !state.isRunning,
      metrics: experimentManager.getMetrics()
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