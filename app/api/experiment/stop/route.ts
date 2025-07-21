import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function POST(request: NextRequest) {
  try {
    // Check if experiment is running
    if (!experimentManager.isRunning()) {
      // Gracefully handle already-stopped experiments
      const finalState = experimentManager.getState();
      
      return NextResponse.json({
        status: 'success', 
        message: 'Experiment was already completed',
        alreadyStopped: true,
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
    }

    // Stop the experiment
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
    console.error('Stop experiment error:', error);
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