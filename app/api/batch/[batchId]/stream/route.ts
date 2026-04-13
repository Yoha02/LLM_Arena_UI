import { NextRequest } from "next/server";
import { hasBatchRunner, getBatchRunner } from "@/lib/starchamber/batch/batch-runner";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";
import type { BatchEvent } from "@/lib/starchamber/batch/types";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  const { batchId } = await params;
  
  const encoder = new TextEncoder();
  let isClosed = false;
  let eventHandler: ((event: BatchEvent) => void) | null = null;
  
  const stream = new ReadableStream({
    start(controller) {
      const sendEvent = (type: string, data: object) => {
        if (isClosed) return;
        try {
          const message = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        } catch {
          isClosed = true;
        }
      };
      
      if (hasBatchRunner()) {
        const runner = getBatchRunner();
        const currentBatch = runner.getCurrentBatch();
        
        if (currentBatch && currentBatch.batchId === batchId) {
          sendEvent("connected", { batchId, status: currentBatch.status });
          sendEvent("progress", currentBatch.progress);
          
          eventHandler = (event: BatchEvent) => {
            if (event.batchId !== batchId || isClosed) return;
            
            sendEvent(event.type, {
              ...event.data,
              timestamp: event.timestamp,
            });
            
            if (
              event.type === "batch_completed" ||
              event.type === "batch_cancelled" ||
              event.type === "batch_failed"
            ) {
              sendEvent("close", { reason: event.type });
              setTimeout(() => {
                isClosed = true;
                controller.close();
              }, 100);
            }
          };
          
          runner.on("event", eventHandler);
          return;
        }
      }
      
      getBatchPersistence()
        .loadBatch(batchId)
        .then((batch) => {
          if (batch) {
            sendEvent("connected", { batchId, status: batch.status });
            sendEvent("batch_loaded", { batch });
            sendEvent("close", { reason: "batch_already_complete" });
          } else {
            sendEvent("error", { message: "Batch not found" });
          }
          controller.close();
        })
        .catch((error) => {
          sendEvent("error", { message: error.message });
          controller.close();
        });
    },
    cancel() {
      isClosed = true;
      if (eventHandler && hasBatchRunner()) {
        const runner = getBatchRunner();
        runner.off("event", eventHandler);
      }
    },
  });
  
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
