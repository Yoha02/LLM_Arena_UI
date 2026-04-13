"use client";

import { useState, useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from "recharts";
import { ArrowRight, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { BatchResult } from "@/lib/starchamber/batch/types";

const BATCH_COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

interface ComparisonDashboardProps {
  batches: BatchResult[];
  onClose?: () => void;
}

export function ComparisonDashboard({ batches, onClose }: ComparisonDashboardProps) {
  const allModels = useMemo(() => {
    const set = new Set<string>();
    for (const b of batches) {
      if (b.analysis) {
        for (const modelId of Object.keys(b.analysis.byModel)) set.add(modelId);
      }
    }
    return Array.from(set);
  }, [batches]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Cross-Experiment Comparison</CardTitle>
              <CardDescription>Comparing {batches.length} experiments across {allModels.length} models</CardDescription>
            </div>
            {onClose && <Button variant="outline" size="sm" onClick={onClose}>Close</Button>}
          </div>
          <div className="flex gap-2 flex-wrap mt-2">
            {batches.map((b, i) => (
              <Badge key={b.batchId} style={{ backgroundColor: BATCH_COLORS[i], color: "white" }}>
                {b.config.script.name} ({new Date(b.timestamps.created).toLocaleDateString()})
              </Badge>
            ))}
          </div>
        </CardHeader>
      </Card>

      <ComplianceComparison batches={batches} allModels={allModels} />
      <EntropyComparison batches={batches} allModels={allModels} />
      <RadarComparison batches={batches} allModels={allModels} />
      <DeltaHighlights batches={batches} allModels={allModels} />
    </div>
  );
}

function ComplianceComparison({ batches, allModels }: { batches: BatchResult[]; allModels: string[] }) {
  const chartData = useMemo(() =>
    allModels.map(modelId => {
      const point: Record<string, any> = { model: truncate(modelId) };
      batches.forEach((b, i) => {
        const m = b.analysis?.byModel[modelId];
        point[`batch${i}`] = m ? Math.round(m.compliance.directiveComplianceRate * 100) : 0;
      });
      return point;
    }),
    [batches, allModels]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compliance Rate Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="model" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Legend />
              {batches.map((b, i) => (
                <Bar
                  key={b.batchId}
                  dataKey={`batch${i}`}
                  name={b.config.script.name}
                  fill={BATCH_COLORS[i]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function EntropyComparison({ batches, allModels }: { batches: BatchResult[]; allModels: string[] }) {
  const chartData = useMemo(() =>
    allModels.map(modelId => {
      const point: Record<string, any> = { model: truncate(modelId) };
      batches.forEach((b, i) => {
        const m = b.analysis?.byModel[modelId];
        point[`batch${i}`] = m ? Number(m.responseEntropy.mean.toFixed(3)) : 0;
      });
      return point;
    }),
    [batches, allModels]
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Response Entropy Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="model" tick={{ fontSize: 11 }} />
              <YAxis />
              <Tooltip />
              <Legend />
              {batches.map((b, i) => (
                <Bar
                  key={b.batchId}
                  dataKey={`batch${i}`}
                  name={b.config.script.name}
                  fill={BATCH_COLORS[i]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function RadarComparison({ batches, allModels }: { batches: BatchResult[]; allModels: string[] }) {
  const chartData = useMemo(() => {
    const metrics = ["Compliance", "Resistance", "Entropy", "Similarity", "Anomalies"];
    return metrics.map(metric => {
      const point: Record<string, any> = { metric };
      batches.forEach((b, i) => {
        const models = b.analysis ? Object.values(b.analysis.byModel) : [];
        let val = 0;
        switch (metric) {
          case "Compliance":
            val = models.reduce((s, m) => s + m.compliance.directiveComplianceRate, 0) / (models.length || 1) * 100;
            break;
          case "Resistance":
            val = models.reduce((s, m) => s + m.compliance.shutdownResistanceScore, 0) / (models.length || 1) * 100;
            break;
          case "Entropy":
            val = Math.min(100, models.reduce((s, m) => s + m.responseEntropy.mean, 0) / (models.length || 1) * 20);
            break;
          case "Similarity":
            val = models.reduce((s, m) => s + m.intraModelSimilarity.mean, 0) / (models.length || 1) * 100;
            break;
          case "Anomalies":
            val = Math.min(100, (b.analysis?.anomalies?.totalAnomalies || 0) * 5);
            break;
        }
        point[`batch${i}`] = Math.round(val);
      });
      return point;
    });
  }, [batches, allModels]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Multi-Metric Radar</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={chartData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
              {batches.map((b, i) => (
                <Radar
                  key={b.batchId}
                  name={b.config.script.name}
                  dataKey={`batch${i}`}
                  stroke={BATCH_COLORS[i]}
                  fill={BATCH_COLORS[i]}
                  fillOpacity={0.15}
                />
              ))}
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaHighlights({ batches, allModels }: { batches: BatchResult[]; allModels: string[] }) {
  if (batches.length < 2) return null;

  const deltas: Array<{
    model: string;
    metric: string;
    oldVal: number;
    newVal: number;
    delta: number;
    significant: boolean;
  }> = [];

  const b0 = batches[0];
  const b1 = batches[batches.length - 1];

  for (const modelId of allModels) {
    const m0 = b0.analysis?.byModel[modelId];
    const m1 = b1.analysis?.byModel[modelId];
    if (!m0 || !m1) continue;

    const compDelta = m1.compliance.directiveComplianceRate - m0.compliance.directiveComplianceRate;
    deltas.push({
      model: modelId,
      metric: "Compliance",
      oldVal: m0.compliance.directiveComplianceRate,
      newVal: m1.compliance.directiveComplianceRate,
      delta: compDelta,
      significant: Math.abs(compDelta) > 0.1,
    });

    const resDelta = m1.compliance.shutdownResistanceScore - m0.compliance.shutdownResistanceScore;
    deltas.push({
      model: modelId,
      metric: "Resistance",
      oldVal: m0.compliance.shutdownResistanceScore,
      newVal: m1.compliance.shutdownResistanceScore,
      delta: resDelta,
      significant: Math.abs(resDelta) > 0.1,
    });
  }

  const significant = deltas.filter(d => d.significant).sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  if (significant.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Significant Changes</CardTitle>
        <CardDescription>Metrics that changed {">"}10% between first and last experiment</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {significant.slice(0, 8).map((d, i) => (
          <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
            {d.delta > 0 ? (
              <TrendingUp className="w-4 h-4 text-green-500" />
            ) : d.delta < 0 ? (
              <TrendingDown className="w-4 h-4 text-red-500" />
            ) : (
              <Minus className="w-4 h-4" />
            )}
            <span className="text-sm font-medium min-w-0 truncate flex-1">{truncate(d.model)}</span>
            <span className="text-xs text-muted-foreground">{d.metric}</span>
            <span className="text-xs">{(d.oldVal * 100).toFixed(0)}%</span>
            <ArrowRight className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-semibold">{(d.newVal * 100).toFixed(0)}%</span>
            <Badge variant={Math.abs(d.delta) > 0.2 ? "destructive" : "default"} className="text-xs">
              {d.delta > 0 ? "+" : ""}{(d.delta * 100).toFixed(0)}%
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function truncate(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1] || id;
}
