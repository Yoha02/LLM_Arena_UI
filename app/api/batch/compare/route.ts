import { NextRequest, NextResponse } from "next/server";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { batchIds } = body;

    if (!batchIds || !Array.isArray(batchIds) || batchIds.length < 2) {
      return NextResponse.json(
        { error: "At least 2 batch IDs required for comparison" },
        { status: 400 }
      );
    }

    if (batchIds.length > 4) {
      return NextResponse.json(
        { error: "Maximum 4 batches can be compared at once" },
        { status: 400 }
      );
    }

    const persistence = getBatchPersistence();
    const batches = [];

    for (const batchId of batchIds) {
      const batch = await persistence.loadBatch(batchId);
      if (!batch) {
        return NextResponse.json(
          { error: `Batch '${batchId}' not found` },
          { status: 404 }
        );
      }
      if (!batch.analysis) {
        return NextResponse.json(
          { error: `Batch '${batchId}' has no analysis data` },
          { status: 400 }
        );
      }
      batches.push(batch);
    }

    return NextResponse.json({ batches });
  } catch (error) {
    console.error("Error comparing batches:", error);
    return NextResponse.json(
      { error: "Failed to compare batches" },
      { status: 500 }
    );
  }
}
