import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function POST(request: NextRequest) {
  try {
    console.log('🎮 Manual next turn requested');

    // Check if experiment is running and in manual mode
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

    const config = experimentManager.getConfig();
    if (config?.experimentMode !== 'manual') {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Manual next turn is only available in manual mode',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Start the next turn
    await experimentManager.startNextTurn();
    const state = experimentManager.getState();

    return NextResponse.json({
      status: 'success',
      message: 'Next turn started successfully',
      timestamp: new Date().toISOString(),
      state: {
        currentTurn: state.currentTurn,
        conversationLength: state.conversation.length,
        waitingForUser: state.waitingForUser,
        nextExpectedModel: state.nextExpectedModel
      }
    });
  } catch (error) {
    console.error('Manual next turn error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to start next turn',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}