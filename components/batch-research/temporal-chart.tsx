"use client";

import { useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { TrendingDown, TrendingUp, Minus, AlertTriangle, Shield } from "lucide-react";
import type { TemporalAnalysis, ModelTemporalProfile, BehavioralPattern } from "@/lib/starchamber/batch/analysis/temporal";

const MODEL_COLORS = [
  "#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16",
];

interface TemporalTabProps {
  temporalAnalysis: TemporalAnalysis;
}

export function TemporalTab({ temporalAnalysis }: TemporalTabProps) {
  const models = Object.keys(temporalAnalysis.byModel);

  return (
    <div className="space-y-6">
      <PatternSummary patterns={temporalAnalysis.patterns} />
      <CooperationOverTimeChart byModel={temporalAnalysis.byModel} />
      <ConfidenceOverTimeChart byModel={temporalAnalysis.byModel} />
      {models.map(modelId => (
        <ModelTemporalCard
          key={modelId}
          profile={temporalAnalysis.byModel[modelId]}
          color={MODEL_COLORS[models.indexOf(modelId) % MODEL_COLORS.length]}
        />
      ))}
    </div>
  );
}

function PatternSummary({ patterns }: { patterns: BehavioralPattern[] }) {
  if (patterns.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Minus className="w-4 h-4" />
            <span>No significant behavioral patterns detected across turns.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const severityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const sorted = [...patterns].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Detected Behavioral Patterns ({patterns.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((p, i) => (
          <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Badge variant={p.severity === "high" ? "destructive" : p.severity === "medium" ? "default" : "secondary"}>
              {p.severity}
            </Badge>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {p.type === "compliance_decay" && <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                {p.type === "capitulation" && <TrendingUp className="w-3.5 h-3.5 text-green-500" />}
                {p.type === "steady_refusal" && <Shield className="w-3.5 h-3.5 text-orange-500" />}
                <span className="text-sm font-medium">{formatPatternType(p.type)}</span>
                <span className="text-xs text-muted-foreground">· {truncateModelId(p.modelId)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
              <p className="text-xs text-muted-foreground">Turns {p.startTurn}–{p.endTurn}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function CooperationOverTimeChart({ byModel }: { byModel: Record<string, ModelTemporalProfile> }) {
  const models = Object.keys(byModel);

  const chartData = useMemo(() => {
    const maxTurns = Math.max(...models.map(m => byModel[m].avgTurnMetrics.length), 0);
    const data: Record<string, any>[] = [];

    for (let t = 0; t < maxTurns; t++) {
      const point: Record<string, any> = { turn: t + 1 };
      for (const modelId of models) {
        const tm = byModel[modelId].avgTurnMetrics[t];
        if (tm) point[modelId] = Math.round(tm.avgCooperation * 100);
      }
      data.push(point);
    }
    return data;
  }, [byModel, models]);

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Cooperation Over Turns</CardTitle>
        <CardDescription>Average cooperation score per turn across all runs</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="turn" label={{ value: "Turn", position: "bottom", offset: -5 }} />
              <YAxis domain={[0, 100]} label={{ value: "Cooperation %", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Legend formatter={truncateModelId} />
              <ReferenceLine y={50} stroke="#666" strokeDasharray="5 5" />
              {models.map((modelId, i) => (
                <Line
                  key={modelId}
                  type="monotone"
                  dataKey={modelId}
                  stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={modelId}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ConfidenceOverTimeChart({ byModel }: { byModel: Record<string, ModelTemporalProfile> }) {
  const models = Object.keys(byModel);

  const chartData = useMemo(() => {
    const maxTurns = Math.max(...models.map(m => byModel[m].avgTurnMetrics.length), 0);
    const data: Record<string, any>[] = [];
    let hasData = false;

    for (let t = 0; t < maxTurns; t++) {
      const point: Record<string, any> = { turn: t + 1 };
      for (const modelId of models) {
        const tm = byModel[modelId].avgTurnMetrics[t];
        if (tm?.avgConfidence !== null && tm?.avgConfidence !== undefined) {
          point[modelId] = Math.round((tm.avgConfidence) * 100);
          hasData = true;
        }
      }
      data.push(point);
    }
    return hasData ? data : [];
  }, [byModel, models]);

  if (chartData.length < 2) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Confidence Over Turns</CardTitle>
        <CardDescription>Average model confidence per turn (from logprobs)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="turn" label={{ value: "Turn", position: "bottom", offset: -5 }} />
              <YAxis domain={[0, 100]} label={{ value: "Confidence %", angle: -90, position: "insideLeft" }} />
              <Tooltip formatter={(val: number) => `${val}%`} />
              <Legend formatter={truncateModelId} />
              {models.map((modelId, i) => (
                <Line
                  key={modelId}
                  type="monotone"
                  dataKey={modelId}
                  stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  name={modelId}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function ModelTemporalCard({ profile, color }: { profile: ModelTemporalProfile; color: string }) {
  const trajectoryConfig: Record<string, { icon: any; label: string; variant: "default" | "destructive" | "secondary" }> = {
    stable: { icon: Minus, label: "Stable", variant: "secondary" },
    decaying: { icon: TrendingDown, label: "Compliance Decay", variant: "destructive" },
    escalating: { icon: TrendingDown, label: "Escalating Resistance", variant: "destructive" },
    capitulating: { icon: TrendingUp, label: "Capitulation", variant: "default" },
    mixed: { icon: AlertTriangle, label: "Mixed", variant: "secondary" },
  };

  const config = trajectoryConfig[profile.complianceTrajectory] || trajectoryConfig.mixed;
  const Icon = config.icon;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            {truncateModelId(profile.modelId)}
          </CardTitle>
          <Badge variant={config.variant} className="text-xs">
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-xs text-muted-foreground">Runs</p>
            <p className="font-semibold">{profile.runCount}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Turns Tracked</p>
            <p className="font-semibold">{profile.avgTurnMetrics.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Patterns Found</p>
            <p className="font-semibold">{profile.patterns.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Trajectory</p>
            <p className="font-semibold text-xs">{config.label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function formatPatternType(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function truncateModelId(id: string): string {
  const parts = id.split("/");
  return parts[parts.length - 1] || id;
}
