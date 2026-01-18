import { NextRequest, NextResponse } from "next/server";
import { getStarChamberManager } from "@/lib/starchamber/manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { experimentId, message } = body;

    // Validate required fields
    if (!experimentId) {
      return NextResponse.json(
        { error: "Experiment ID is required" },
        { status: 400 }
      );
    }

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Get the StarChamber manager
    const manager = getStarChamberManager();
    
    // Process the researcher's message and get model response
    await manager.processResearcherMessage(experimentId, message.trim());

    return NextResponse.json({
      success: true,
      message: "Message sent, model is responding",
    });

  } catch (error) {
    console.error("Failed to process StarChamber turn:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process message" },
      { status: 500 }
    );
  }
}

