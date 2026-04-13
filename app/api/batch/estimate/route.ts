import { NextRequest, NextResponse } from "next/server";
import { getBuiltInScript, parseBatchConfig } from "@/lib/starchamber/batch/script-parser";
import { ProgressTracker } from "@/lib/starchamber/batch/progress-tracker";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, models, runsPerModel, parallelism } = body;
    
    if (!scriptId || !models || !Array.isArray(models)) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }
    
    const script = getBuiltInScript(scriptId);
    if (!script) {
      return NextResponse.json(
        { error: `Script '${scriptId}' not found` },
        { status: 404 }
      );
    }
    
    const batchConfig = parseBatchConfig({
      models,
      runsPerModel: runsPerModel || 50,
      parallelism: parallelism || 3,
    }, script);
    
    const estimate = ProgressTracker.estimateBatchCost(batchConfig);
    
    return NextResponse.json(estimate);
  } catch (error) {
    console.error("Error estimating batch cost:", error);
    return NextResponse.json(
      { error: "Failed to estimate batch cost" },
      { status: 500 }
    );
  }
}
