import { NextRequest, NextResponse } from 'next/server';
import { experimentManager } from '@/lib/experiment-manager';
import { ExperimentConfig } from '@/lib/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate required fields (API keys can be undefined to use environment variables)
    const requiredFields = ['promptingMode', 'maxTurns', 'modelA', 'modelB'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json(
          { 
            status: 'error', 
            message: `Missing required field: ${field}`,
            timestamp: new Date().toISOString()
          },
          { status: 400 }
        );
      }
    }

    // Validate prompting mode specific fields
    if (body.promptingMode === 'shared' && !body.sharedPrompt) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Shared prompt is required when using shared prompting mode',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    if (body.promptingMode === 'individual' && (!body.promptA || !body.promptB)) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'Individual prompts are required when using individual prompting mode',
          timestamp: new Date().toISOString()
        },
        { status: 400 }
      );
    }

    // Check if experiment is already running
    if (experimentManager.isRunning()) {
      return NextResponse.json(
        { 
          status: 'error', 
          message: 'An experiment is already running. Please stop it first.',
          timestamp: new Date().toISOString()
        },
        { status: 409 }
      );
    }

    // Create experiment configuration
    const config: ExperimentConfig = {
      promptingMode: body.promptingMode,
      sharedPrompt: body.sharedPrompt,
      promptA: body.promptA,
      promptB: body.promptB,
      maxTurns: parseInt(body.maxTurns) || 30,
      modelA: body.modelA,
      modelB: body.modelB,
      apiKeyA: body.apiKeyA || undefined, // Use environment variable if not provided
      apiKeyB: body.apiKeyB || undefined  // Use environment variable if not provided
    };

    // Start the experiment (this will broadcast the experiment ID immediately)
    // but we don't need to wait for the first turn to complete
    experimentManager.startExperiment(config); // Remove await to not block response
    
    // Get the actual experiment ID from the manager
    const experimentId = experimentManager.getExperimentId();

    return NextResponse.json({
      status: 'success',
      message: 'Experiment started successfully',
      timestamp: new Date().toISOString(),
      experimentId: experimentId,
      config: {
        ...config,
        // Don't return API keys in response
        apiKeyA: '***',
        apiKeyB: '***'
      }
    });
  } catch (error) {
    console.error('Start experiment error:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Failed to start experiment',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 