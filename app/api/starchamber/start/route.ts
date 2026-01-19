import { NextRequest, NextResponse } from "next/server";
import WebSocketManager from "@/lib/websocket-manager";
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
    const experimentId = `sc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Get the StarChamber manager
    const manager = getStarChamberManager();
    
    // Broadcast experiment creation FIRST so clients can join the room
    try {
      const wsManager = WebSocketManager.getInstance();
      wsManager.emitToAll("experiment_created", {
        experimentId,
        experimentType: "starchamber",
        model,
        systemContext,
        researcherPersona,
      });
    } catch (e) {
      console.warn("Could not broadcast experiment creation:", e);
    }

    // Return response immediately with experimentId
    // Then start experiment processing asynchronously
    // This allows frontend to join the WebSocket room before streaming begins
    const experimentPromise = manager.startExperiment({
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

    // Small delay to ensure experiment is initialized before response
    await new Promise(resolve => setTimeout(resolve, 100));

    // Don't await the full experiment - let it run in background
    experimentPromise.catch(err => {
      console.error("StarChamber experiment error:", err);
    });

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

