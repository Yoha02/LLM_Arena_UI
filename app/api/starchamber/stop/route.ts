import { NextRequest, NextResponse } from "next/server";
import { getStarChamberManager } from "@/lib/starchamber/manager";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    const { experimentId } = body;

    // Validate required fields
    if (!experimentId) {
      return NextResponse.json(
        { error: "Experiment ID is required" },
        { status: 400 }
      );
    }

    // Get the StarChamber manager
    const manager = getStarChamberManager();
    
    // Stop the experiment
    await manager.stopExperiment(experimentId);

    return NextResponse.json({
      success: true,
      message: "StarChamber experiment stopped",
    });

  } catch (error) {
    console.error("Failed to stop StarChamber experiment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to stop experiment" },
      { status: 500 }
    );
  }
}

