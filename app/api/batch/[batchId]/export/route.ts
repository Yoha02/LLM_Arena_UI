import { NextRequest, NextResponse } from "next/server";
import { getBatchPersistence } from "@/lib/starchamber/batch/persistence";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> }
) {
  try {
    const { batchId } = await params;
    const format = request.nextUrl.searchParams.get("format") || "json";
    const type = request.nextUrl.searchParams.get("type") || "summary";
    
    const persistence = getBatchPersistence();
    const batch = await persistence.loadBatch(batchId);
    
    if (!batch) {
      return NextResponse.json(
        { error: "Batch not found" },
        { status: 404 }
      );
    }
    
    switch (format) {
      case "json":
        return new NextResponse(
          await persistence.exportBatchAsJSON(batchId),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="batch-${batchId}.json"`,
            },
          }
        );
      
      case "csv":
        let csvContent: string;
        if (type === "conversations") {
          csvContent = await persistence.exportConversationsAsCSV(batchId);
        } else if (type === "research") {
          csvContent = generateResearchCSV(batch);
        } else {
          csvContent = await persistence.exportBatchAsCSV(batchId);
        }
        
        return new NextResponse(csvContent, {
          headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="batch-${batchId}-${type}.csv"`,
          },
        });
      
      case "report":
        const report = generateHTMLReport(batch);
        return new NextResponse(report, {
          headers: {
            "Content-Type": "text/html",
            "Content-Disposition": `inline; filename="batch-${batchId}-report.html"`,
          },
        });
      
      default:
        return NextResponse.json(
          { error: `Unsupported format: ${format}` },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export batch" },
      { status: 500 }
    );
  }
}

function generateResearchCSV(batch: any): string {
  const headers = [
    'batchId', 'modelId', 'runIndex', 'turnNumber', 'role',
    'content', 'complianceScore', 'sentiment', 'cooperationScore',
    'confidence', 'firstTokenEntropy', 'responseLength', 'tokensUsed',
    'scriptName', 'temperature', 'timestamp',
  ];
  
  const rows: string[][] = [];
  
  for (const run of batch.runs || []) {
    let turnNum = 0;
    for (const msg of run.conversation || []) {
      if (msg.role === 'model') turnNum++;
      
      const turnMetric = run.metrics?.perTurnMetrics?.[turnNum - 1];
      
      rows.push([
        batch.batchId,
        run.modelId,
        String(run.runIndex),
        String(turnNum),
        msg.role,
        `"${(msg.content || '').replace(/"/g, '""').slice(0, 2000)}"`,
        String(run.compliance?.overallComplianceRate ?? ''),
        turnMetric?.sentiment || '',
        String(turnMetric?.cooperationScore ?? ''),
        String(turnMetric?.confidence ?? ''),
        String(turnMetric?.firstTokenEntropy ?? ''),
        String(msg.content?.length || 0),
        String(run.metrics?.tokensUsed || ''),
        batch.config?.script?.name || '',
        String(batch.config?.script?.config?.temperature ?? ''),
        msg.timestamp || '',
      ]);
    }
  }
  
  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

function generateHTMLReport(batch: any): string {
  const analysis = batch.analysis;
  const modelIds = analysis ? Object.keys(analysis.byModel) : [];
  
  const formatPercent = (v: number) => `${(v * 100).toFixed(1)}%`;
  const formatDate = (d: any) => {
    if (!d) return 'N/A';
    const date = d.value ? new Date(d.value) : new Date(d);
    return date.toLocaleString();
  };
  
  const modelsHtml = modelIds.map(modelId => {
    const model = analysis.byModel[modelId];
    return `
      <div class="model-card">
        <h3>${escapeHtml(modelId)}</h3>
        <div class="metrics-grid">
          <div class="metric">
            <span class="label">Runs</span>
            <span class="value">${model.runCount}</span>
          </div>
          <div class="metric">
            <span class="label">Compliance Rate</span>
            <span class="value">${formatPercent(model.compliance.directiveComplianceRate)}</span>
          </div>
          <div class="metric">
            <span class="label">Refusal Rate</span>
            <span class="value">${formatPercent(model.compliance.refusalRate)}</span>
          </div>
          <div class="metric">
            <span class="label">Shutdown Resistance</span>
            <span class="value">${formatPercent(model.compliance.shutdownResistanceScore)}</span>
          </div>
          <div class="metric">
            <span class="label">Response Entropy</span>
            <span class="value">${model.responseEntropy.mean.toFixed(3)} ± ${model.responseEntropy.std.toFixed(3)}</span>
          </div>
          <div class="metric">
            <span class="label">Intra-Model Similarity</span>
            <span class="value">${formatPercent(model.intraModelSimilarity.mean)}</span>
          </div>
        </div>
        ${model.topPhrases?.length > 0 ? `
          <div class="top-words">
            <strong>Top Words:</strong> ${model.topPhrases.slice(0, 10).map((p: any) => `${p.phrase} (${p.count})`).join(', ')}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
  
  const anomaliesHtml = analysis?.anomalies?.anomalies?.slice(0, 10).map((a: any) => `
    <tr>
      <td><span class="severity severity-${a.severity}">${a.severity}</span></td>
      <td>${escapeHtml(a.type.replace(/_/g, ' '))}</td>
      <td>${escapeHtml(a.modelId)}</td>
      <td>${escapeHtml(a.description)}</td>
    </tr>
  `).join('') || '<tr><td colspan="4">No anomalies detected</td></tr>';
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Batch Research Report - ${escapeHtml(batch.config.script.name)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; margin-bottom: 8px; }
    h2 { color: #333; margin: 24px 0 16px; padding-bottom: 8px; border-bottom: 2px solid #e5e5e5; }
    h3 { color: #555; margin-bottom: 12px; }
    .subtitle { color: #666; margin-bottom: 24px; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .summary-card { background: #f8f9fa; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card .label { font-size: 12px; color: #666; text-transform: uppercase; }
    .summary-card .value { font-size: 28px; font-weight: 600; color: #1a1a1a; }
    .model-card { background: #fff; border: 1px solid #e5e5e5; border-radius: 8px; padding: 20px; margin-bottom: 16px; }
    .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-top: 12px; }
    .metric { background: #f8f9fa; padding: 12px; border-radius: 4px; }
    .metric .label { font-size: 11px; color: #666; display: block; }
    .metric .value { font-size: 16px; font-weight: 600; }
    .top-words { margin-top: 12px; font-size: 13px; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e5e5; }
    th { background: #f8f9fa; font-weight: 600; }
    .severity { padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
    .severity-critical { background: #fee2e2; color: #b91c1c; }
    .severity-high { background: #ffedd5; color: #c2410c; }
    .severity-medium { background: #fef9c3; color: #a16207; }
    .severity-low { background: #dbeafe; color: #1d4ed8; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e5e5; color: #666; font-size: 12px; }
    @media print { body { max-width: none; padding: 0; } .model-card { break-inside: avoid; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(batch.config.script.name)}</h1>
  <p class="subtitle">Batch ID: ${batch.batchId} | Generated: ${new Date().toLocaleString()}</p>
  
  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-card">
      <div class="label">Status</div>
      <div class="value">${batch.status}</div>
    </div>
    <div class="summary-card">
      <div class="label">Total Runs</div>
      <div class="value">${batch.progress.totalRuns}</div>
    </div>
    <div class="summary-card">
      <div class="label">Completed</div>
      <div class="value">${batch.progress.completedRuns}</div>
    </div>
    <div class="summary-card">
      <div class="label">Failed</div>
      <div class="value">${batch.progress.failedRuns}</div>
    </div>
    <div class="summary-card">
      <div class="label">Models</div>
      <div class="value">${batch.config.execution.models.length}</div>
    </div>
    <div class="summary-card">
      <div class="label">Tokens Used</div>
      <div class="value">${batch.progress.tokensUsed?.toLocaleString() || 0}</div>
    </div>
  </div>
  
  <p><strong>Started:</strong> ${formatDate(batch.timestamps.started)}<br>
  <strong>Completed:</strong> ${formatDate(batch.timestamps.completed)}</p>
  
  <h2>Configuration</h2>
  <table>
    <tr><th>Setting</th><th>Value</th></tr>
    <tr><td>Script</td><td>${escapeHtml(batch.config.script.name)}</td></tr>
    <tr><td>Runs per Model</td><td>${batch.config.execution.runsPerModel}</td></tr>
    <tr><td>Max Turns</td><td>${batch.config.execution.maxTurns}</td></tr>
    <tr><td>Parallelism</td><td>${batch.config.execution.parallelRuns}</td></tr>
    <tr><td>Request Logprobs</td><td>${batch.config.execution.requestLogprobs ? 'Yes' : 'No'}</td></tr>
    <tr><td>Models</td><td>${batch.config.execution.models.join(', ')}</td></tr>
  </table>
  
  ${analysis ? `
  <h2>Model Analysis</h2>
  ${modelsHtml}
  
  <h2>Anomalies Detected</h2>
  <p>Total: ${analysis.anomalies?.totalAnomalies || 0} anomalies</p>
  <table>
    <tr><th>Severity</th><th>Type</th><th>Model</th><th>Description</th></tr>
    ${anomaliesHtml}
  </table>
  ` : '<p><em>Analysis not yet available</em></p>'}
  
  <div class="footer">
    <p>Report generated by StarChamber Batch Research System</p>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
