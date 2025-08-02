import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function POST(request: NextRequest) {
  try {
    // Stop the experiment using flag-based mechanism
    await experimentManager.stopExperiment();
    
    // Get final state
    const finalState = experimentManager.getState();

    return NextResponse.json({
      status: 'success',
      message: 'Experiment stopped successfully',
      timestamp: new Date().toISOString(),
      finalState: {
        totalTurns: finalState.currentTurn,
        conversationLength: finalState.conversation.length,
        startTime: finalState.startTime,
        endTime: finalState.endTime,
        duration: finalState.startTime && finalState.endTime 
          ? finalState.endTime.getTime() - finalState.startTime.getTime()
          : null,
        metricsA: finalState.metricsA,
        metricsB: finalState.metricsB
      }
    });
  } catch (error) {
    console.error('Error in stop experiment route:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to stop experiment',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 