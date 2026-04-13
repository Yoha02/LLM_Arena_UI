import { NextRequest, NextResponse } from "next/server";
import { getBuiltInScript, parseBatchConfig } from "@/lib/starchamber/batch/script-parser";
import { initBatchRunner, hasBatchRunner, getBatchRunner, resetBatchRunner } from "@/lib/starchamber/batch/batch-runner";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";
import { analyzeBatchResults, initLLMJudge } from "@/lib/starchamber/batch/analysis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { scriptId, models, runsPerModel, parallelism } = body;
    
    if (!scriptId || !models || !Array.isArray(models) || models.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields: scriptId and models array required" },
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
    
    const openrouterApiKey = process.env.OPENROUTER_API_KEY;
    const togetherApiKey = process.env.TOGETHER_API_KEY;
    
    if (!openrouterApiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY not configured" },
        { status: 500 }
      );
    }
    
    if (openrouterApiKey) {
      initLLMJudge(openrouterApiKey);
    }
    
    const batchConfig = parseBatchConfig({
      models,
      runsPerModel: runsPerModel || 50,
      parallelism: parallelism || 3,
    }, script);
    
    const persistence = getBatchPersistence();
    
    // Reset any existing runner before creating a new one
    if (hasBatchRunner()) {
      const existingRunner = getBatchRunner();
      if (existingRunner.getCurrentBatch()?.status === 'running') {
        return NextResponse.json(
          { error: "A batch is already running. Stop it first before starting a new one." },
          { status: 409 }
        );
      }
      resetBatchRunner();
    }
    
    const runner = initBatchRunner({
      openrouterApiKey,
      togetherApiKey,
      onEvent: async (event) => {
        if (event.type === "batch_completed" || event.type === "batch_failed") {
          const batch = runner.getCurrentBatch();
          if (batch) {
            await persistence.saveBatch(batch);
          }
        }
        if (event.type === "batch_progress" && Math.random() < 0.1) {
          const batch = runner.getCurrentBatch();
          if (batch) {
            await persistence.saveBatch(batch);
          }
        }
      },
    });
    
    const batchPromise = runner.startBatch(batchConfig);
    
    batchPromise.then(async (result) => {
      console.log(`Batch ${result.batchId} completed, running analysis...`);
      
      try {
        const openaiApiKey = process.env.OPENAI_API_KEY;
        const analysis = await analyzeBatchResults(result, {
          calculateEntropy: true,
          calculateEmbeddings: !!openaiApiKey,
          detectAnomalies: true,
          complianceMetrics: true,
          openaiApiKey,
        });
        
        result.analysis = analysis;
        console.log(`Analysis complete for batch ${result.batchId}`);
      } catch (error) {
        console.error(`Analysis failed for batch ${result.batchId}:`, error);
      }
      
      await persistence.saveBatch(result);
    }).catch(console.error);
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const initialBatch = runner.getCurrentBatch();
    
    return NextResponse.json(initialBatch);
  } catch (error) {
    console.error("Error starting batch:", error);
    return NextResponse.json(
      { error: "Failed to start batch" },
      { status: 500 }
    );
  }
}
