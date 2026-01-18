import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getWebSocketManager } from "@/lib/websocket-manager";
import { getStarChamberManager } from "@/lib/starchamber/manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { 
      model, 
      systemContext, 
      researcherPersona,
      requestLogprobs,
      firstMessage,
    } = body;

    // Validate required fields
    if (!model?.modelId) {
      return NextResponse.json(
        { error: "Model selection is required" },
        { status: 400 }
      );
    }

    if (!firstMessage?.trim()) {
      return NextResponse.json(
        { error: "First message is required" },
        { status: 400 }
      );
    }

    // Generate experiment ID
    const experimentId = `sc-${uuidv4()}`;

    // Get the StarChamber manager
    const manager = getStarChamberManager();
    
    // Start the experiment
    await manager.startExperiment({
      experimentId,
      config: {
        experimentType: "starchamber",
        model,
        systemContext: systemContext || "",
        researcherPersona: researcherPersona || "You",
        requestLogprobs: requestLogprobs ?? true,
      },
      firstMessage: firstMessage.trim(),
    });

    // Broadcast experiment creation
    const wsManager = getWebSocketManager();
    if (wsManager) {
      wsManager.broadcastExperimentCreated(experimentId, {
        experimentType: "starchamber",
        model,
        systemContext,
        researcherPersona,
      });
    }

    return NextResponse.json({
      success: true,
      experimentId,
      message: "StarChamber experiment started",
    });

  } catch (error) {
    console.error("Failed to start StarChamber experiment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start experiment" },
      { status: 500 }
    );
  }
}

