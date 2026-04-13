import { NextRequest, NextResponse } from "next/server";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";
import { analyzeBatchResults } from "@/lib/starchamber/batch/analysis";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    
    const persistence = getBatchPersistence();
    const batch = await persistence.loadBatch(batchId);
    
    if (!batch) {
      return NextResponse.json(
        { error: `Batch '${batchId}' not found` },
        { status: 404 }
      );
    }
    
    if (batch.status !== 'completed') {
      return NextResponse.json(
        { error: `Batch '${batchId}' is not yet completed (status: ${batch.status})` },
        { status: 400 }
      );
    }
    
    console.log(`Running analysis for batch ${batchId}...`);
    
    const openaiApiKey = process.env.OPENAI_API_KEY;
    
    const analysis = await analyzeBatchResults(batch, {
      calculateEntropy: true,
      calculateEmbeddings: !!openaiApiKey,
      detectAnomalies: true,
      complianceMetrics: true,
      openaiApiKey,
    });
    
    batch.analysis = analysis;
    await persistence.saveBatch(batch);
    
    console.log(`Analysis complete for batch ${batchId}`);
    
    return NextResponse.json({ 
      success: true, 
      batchId,
      hasAnalysis: true,
      modelCount: Object.keys(analysis.byModel).length,
    });
  } catch (error) {
    console.error("Error running analysis:", error);
    return NextResponse.json(
      { error: "Failed to run analysis" },
      { status: 500 }
    );
  }
}
