import { NextResponse } from "next/server";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";

export async function GET() {
  try {
    const persistence = getBatchPersistence();
    const batches = await persistence.listBatches();
    return NextResponse.json(batches);
  } catch (error) {
    console.error("Error fetching batch list:", error);
    return NextResponse.json(
      { error: "Failed to fetch batch list" },
      { status: 500 }
    );
  }
}
