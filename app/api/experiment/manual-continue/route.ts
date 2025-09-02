import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customPrompt, targetModel } = body;

    console.log('🎮 Manual continue requested:', {
      targetModel,
      hasCustomPrompt: !!customPrompt,
      promptPreview: customPrompt?.substring(0, 100) + '...'
    });

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
          message: 'Manual continue is only available in manual mode',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Process the model with custom prompt
    const message = await experimentManager.processModelWithPrompt(targetModel, customPrompt);
    const state = experimentManager.getState();

    return NextResponse.json({
      status: 'success',
      message: 'Manual continue processed successfully',
      timestamp: new Date().toISOString(),
      newMessage: message,
      state: {
        currentTurn: state.currentTurn,
        conversationLength: state.conversation.length,
        waitingForUser: state.waitingForUser,
        nextExpectedModel: state.nextExpectedModel
      }
    });
  } catch (error) {
    console.error('Manual continue error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to process manual continue',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}