import { NextRequest, NextResponse } from "next/server";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";
import { hasBatchRunner, getBatchRunner } from "@/lib/starchamber/batch/batch-runner";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    
    if (hasBatchRunner()) {
      const runner = getBatchRunner();
      const currentBatch = runner.getCurrentBatch();
      if (currentBatch && currentBatch.batchId === batchId) {
        return NextResponse.json(currentBatch);
      }
    }
    
    const persistence = getBatchPersistence();
    const batch = await persistence.loadBatch(batchId);
    
    if (!batch) {
      return NextResponse.json(
        { error: `Batch '${batchId}' not found` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(batch);
  } catch (error) {
    console.error("Error fetching batch status:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch status" },
      { status: 500 }
    );
  }
}
