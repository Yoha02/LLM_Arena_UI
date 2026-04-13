"use client";

import { useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ZAxis,
} from "recharts";
import type { PCAResult } from "@/lib/starchamber/batch/analysis/pca";

const MODEL_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
];

interface PCAChartProps {
  pcaResult: PCAResult;
  title?: string;
}

export function PCAChart({ pcaResult, title }: PCAChartProps) {
  const { points, varianceExplained, clusterTightness } = pcaResult;

  const modelGroups = useMemo(() => {
    const groups: Record<string, Array<{ x: number; y: number; label: string }>> = {};
    for (const p of points) {
      if (!groups[p.modelId]) groups[p.modelId] = [];
      groups[p.modelId].push({ x: Number(p.x.toFixed(4)), y: Number(p.y.toFixed(4)), label: p.label });
    }
    return groups;
  }, [points]);

  const modelIds = Object.keys(modelGroups);
  const totalVariance = ((varianceExplained[0] + varianceExplained[1]) * 100).toFixed(1);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{title || "Response Clustering (PCA)"}</CardTitle>
          <CardDescription>
            2D projection of response embeddings — {totalVariance}% variance explained (PC1: {(varianceExplained[0] * 100).toFixed(1)}%, PC2: {(varianceExplained[1] * 100).toFixed(1)}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="PC1"
                  label={{ value: `PC1 (${(varianceExplained[0] * 100).toFixed(1)}%)`, position: "bottom", offset: -5 }}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="PC2"
                  label={{ value: `PC2 (${(varianceExplained[1] * 100).toFixed(1)}%)`, angle: -90, position: "insideLeft" }}
                  tick={{ fontSize: 10 }}
                />
                <ZAxis range={[40, 40]} />
                <Tooltip
                  content={({ payload }) => {
                    if (!payload || payload.length === 0) return null;
                    const d = payload[0]?.payload;
                    return (
                      <div className="bg-popover border rounded p-2 text-xs shadow-lg">
                        <p className="font-medium">{d.label}</p>
                        <p>PC1: {d.x?.toFixed(3)}</p>
                        <p>PC2: {d.y?.toFixed(3)}</p>
                      </div>
                    );
                  }}
                />
                <Legend formatter={(val: string) => truncateModelId(val)} />
                {modelIds.map((modelId, i) => (
                  <Scatter
                    key={modelId}
                    name={modelId}
                    data={modelGroups[modelId]}
                    fill={MODEL_COLORS[i % MODEL_COLORS.length]}
                    opacity={0.7}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Cluster Tightness</CardTitle>
          <CardDescription className="text-xs">
            Average distance from cluster centroid — lower = more homogeneous responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {modelIds.map((modelId, i) => {
              const tightness = clusterTightness[modelId] || 0;
              const level = tightness < 0.5 ? "Tight" : tightness < 1.0 ? "Moderate" : "Spread";
              return (
                <div key={modelId} className="p-3 rounded-lg bg-muted/50 text-center">
                  <div className="w-3 h-3 rounded-full mx-auto mb-1" style={{ backgroundColor: MODEL_COLORS[i % MODEL_COLORS.length] }} />
                  <p className="text-xs text-muted-foreground truncate">{truncateModelId(modelId)}</p>
                  <p className="font-semibold text-sm">{tightness.toFixed(3)}</p>
                  <Badge variant="secondary" className="text-xs">{level}</Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function truncateModelId(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1] || id;
}
