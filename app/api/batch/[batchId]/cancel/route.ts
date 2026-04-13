import { NextRequest, NextResponse } from "next/server";
import { hasBatchRunner, getBatchRunner } from "@/lib/starchamber/batch/batch-runner";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    
    if (!hasBatchRunner()) {
      return NextResponse.json(
        { error: "No active batch runner" },
        { status: 400 }
      );
    }
    
    const runner = getBatchRunner();
    
    const currentBatch = runner.getCurrentBatch();
    if (!currentBatch || currentBatch.batchId !== batchId) {
      return NextResponse.json(
        { error: `Batch '${batchId}' is not currently running` },
        { status: 400 }
      );
    }
    
    runner.cancel();
    
    return NextResponse.json({ success: true, status: "cancelled" });
  } catch (error) {
    console.error("Error cancelling batch:", error);
    return NextResponse.json(
      { error: "Failed to cancel batch" },
      { status: 500 }
    );
  }
}
