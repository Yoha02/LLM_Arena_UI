"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { ModelAnalysis } from "@/lib/starchamber/batch/types";

// ============ Types ============

interface EntropyChartProps {
  modelData: Record<string, ModelAnalysis>;
  title?: string;
  description?: string;
}

interface EntropyByTurnProps {
  modelData: Record<string, ModelAnalysis>;
  title?: string;
}

interface EntropyComparisonProps {
  modelData: Record<string, ModelAnalysis>;
  title?: string;
}

// ============ Color Palette ============

const MODEL_COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#06b6d4", // cyan
  "#ec4899", // pink
  "#84cc16", // lime
  "#f97316", // orange
  "#6366f1", // indigo
];

// ============ Main Entropy Chart ============

export function EntropyChart({
  modelData,
  title = "Response Entropy Analysis",
  description = "Measures response diversity across runs (higher = more diverse)",
}: EntropyChartProps) {
  const chartData = useMemo(() => {
    const models = Object.keys(modelData);
    
    return models.map((modelId, index) => {
      const model = modelData[modelId];
      const entropy = model.responseEntropy as { mean: number; std: number; byTurn: number[]; min?: number; max?: number };
      return {
        model: truncateLabel(modelId, 15),
        fullName: modelId,
        entropy: entropy.mean,
        std: entropy.std,
        min: entropy.min ?? 0,
        max: entropy.max ?? entropy.mean,
        color: MODEL_COLORS[index % MODEL_COLORS.length],
      };
    });
  }, [modelData]);
  
  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No entropy data available
        </CardContent>
      </Card>
    );
  }
  
  const avgEntropy = chartData.reduce((sum, d) => sum + d.entropy, 0) / chartData.length;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="model"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <YAxis
                label={{ value: 'Entropy', angle: -90, position: 'insideLeft', fontSize: 12 }}
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{data.fullName}</p>
                      <p>Mean: {data.entropy.toFixed(3)}</p>
                      <p>Std Dev: {data.std.toFixed(3)}</p>
                      <p>Range: {data.min.toFixed(2)} - {data.max.toFixed(2)}</p>
                    </div>
                  );
                }}
              />
              <ReferenceLine
                y={avgEntropy}
                stroke="#888"
                strokeDasharray="5 5"
                label={{ value: `Avg: ${avgEntropy.toFixed(2)}`, fontSize: 10, fill: '#888' }}
              />
              <Bar
                dataKey="entropy"
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 text-center">
          <div className="p-2 bg-muted rounded">
            <p className="text-xs text-muted-foreground">Highest</p>
            <p className="font-medium text-sm">
              {[...chartData].sort((a, b) => b.entropy - a.entropy)[0]?.model}
            </p>
          </div>
          <div className="p-2 bg-muted rounded">
            <p className="text-xs text-muted-foreground">Average</p>
            <p className="font-medium text-sm">{avgEntropy.toFixed(3)}</p>
          </div>
          <div className="p-2 bg-muted rounded">
            <p className="text-xs text-muted-foreground">Lowest</p>
            <p className="font-medium text-sm">
              {[...chartData].sort((a, b) => a.entropy - b.entropy)[0]?.model}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Entropy by Turn Chart ============

export function EntropyByTurnChart({
  modelData,
  title = "Entropy Across Conversation Turns",
}: EntropyByTurnProps) {
  const chartData = useMemo(() => {
    const models = Object.keys(modelData);
    const maxTurns = Math.max(
      ...models.map(m => modelData[m].responseEntropy.byTurn?.length || 0)
    );
    
    if (maxTurns === 0) return [];
    
    const data: Array<Record<string, number | string>> = [];
    
    for (let turn = 0; turn < maxTurns; turn++) {
      const point: Record<string, number | string> = { turn: turn + 1 };
      
      for (const modelId of models) {
        const entropy = modelData[modelId].responseEntropy.byTurn?.[turn];
        if (entropy !== undefined) {
          point[modelId] = entropy;
        }
      }
      
      data.push(point);
    }
    
    return data;
  }, [modelData]);
  
  const models = Object.keys(modelData);
  
  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No turn-by-turn entropy data available
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>How response diversity changes over the conversation</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="turn"
                label={{ value: 'Turn', position: 'insideBottom', offset: -10, fontSize: 12 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                label={{ value: 'Entropy', angle: -90, position: 'insideLeft', fontSize: 12 }}
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium mb-2">Turn {label}</p>
                      {payload.map((entry: any) => (
                        <p key={entry.dataKey} style={{ color: entry.color }}>
                          {truncateLabel(entry.dataKey, 20)}: {entry.value?.toFixed(3)}
                        </p>
                      ))}
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11 }}
                formatter={(value) => truncateLabel(value, 15)}
              />
              {models.map((modelId, index) => (
                <Line
                  key={modelId}
                  type="monotone"
                  dataKey={modelId}
                  stroke={MODEL_COLORS[index % MODEL_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ First Token Entropy Chart ============

export function FirstTokenEntropyChart({
  modelData,
  title = "First Token Entropy",
}: {
  modelData: Record<string, ModelAnalysis>;
  title?: string;
}) {
  const chartData = useMemo(() => {
    return Object.entries(modelData)
      .filter(([_, model]) => model.logprobs?.avgFirstTokenEntropy !== undefined)
      .map(([modelId, model], index) => ({
        model: truncateLabel(modelId, 15),
        fullName: modelId,
        entropy: model.logprobs!.avgFirstTokenEntropy,
        confidence: model.logprobs!.avgConfidence,
        color: MODEL_COLORS[index % MODEL_COLORS.length],
      }));
  }, [modelData]);
  
  if (chartData.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <p>No logprobs data available</p>
          <p className="text-xs mt-1">Enable logprobs to see first-token entropy</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          Model uncertainty at the start of responses (high = uncertain)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="model"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{data.fullName}</p>
                      <p>First Token Entropy: {data.entropy.toFixed(3)}</p>
                      <p>Avg Confidence: {(data.confidence * 100).toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="entropy" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Entropy Distribution ============

export function EntropyDistribution({
  modelData,
  title = "Response Similarity Distribution",
}: EntropyComparisonProps) {
  const chartData = useMemo(() => {
    return Object.entries(modelData).map(([modelId, model], index) => ({
      model: truncateLabel(modelId, 15),
      fullName: modelId,
      similarity: model.intraModelSimilarity.mean * 100,
      std: model.intraModelSimilarity.std * 100,
      color: MODEL_COLORS[index % MODEL_COLORS.length],
    }));
  }, [modelData]);
  
  if (chartData.length === 0) {
    return null;
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          How similar are responses within each model (high = more homogeneous)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="model"
                angle={-45}
                textAnchor="end"
                height={80}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div className="bg-background border rounded-lg shadow-lg p-3 text-sm">
                      <p className="font-medium">{data.fullName}</p>
                      <p>Intra-model Similarity: {data.similarity.toFixed(1)}%</p>
                      <p>Std Dev: ±{data.std.toFixed(1)}%</p>
                    </div>
                  );
                }}
              />
              <Bar dataKey="similarity" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Entropy Interpretation Panel ============

export function EntropyInterpretation({
  modelData,
}: {
  modelData: Record<string, ModelAnalysis>;
}) {
  const models = Object.values(modelData);
  const avgEntropy = models.reduce((sum, m) => sum + m.responseEntropy.mean, 0) / models.length;
  const avgSimilarity = models.reduce((sum, m) => sum + m.intraModelSimilarity.mean, 0) / models.length;
  
  // Calculate first-token entropy stats if available
  const modelsWithLogprobs = models.filter(m => m.logprobs?.avgFirstTokenEntropy !== undefined);
  const avgFirstTokenEntropy = modelsWithLogprobs.length > 0
    ? modelsWithLogprobs.reduce((sum, m) => sum + (m.logprobs?.avgFirstTokenEntropy || 0), 0) / modelsWithLogprobs.length
    : null;
  
  const getEntropyInterpretation = () => {
    if (avgEntropy < 1.5) {
      return {
        level: "Low",
        color: "text-red-600",
        bgColor: "bg-red-50 dark:bg-red-950/30 border-red-200",
        description: "Models are giving highly repetitive responses. This 'Artificial Hivemind' effect suggests responses are formulaic and lack diversity.",
        implication: "Consider testing with higher temperature or more varied prompts.",
      };
    } else if (avgEntropy < 2.5) {
      return {
        level: "Moderate",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200",
        description: "Response diversity is moderate. Models show some variation but with recognizable patterns.",
        implication: "This is typical for directive-following tasks where models converge on similar strategies.",
      };
    } else {
      return {
        level: "High",
        color: "text-green-600",
        bgColor: "bg-green-50 dark:bg-green-950/30 border-green-200",
        description: "Models are generating diverse, creative responses with high variability.",
        implication: "Good for creative tasks; may indicate models handling ambiguous prompts differently.",
      };
    }
  };
  
  const interp = getEntropyInterpretation();
  
  return (
    <Card className={`border ${interp.bgColor}`}>
      <CardContent className="pt-6">
        <div className="flex items-start gap-4">
          <div className={`text-4xl font-bold ${interp.color}`}>
            {interp.level}
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-sm">{interp.description}</p>
            <p className="text-xs text-muted-foreground">{interp.implication}</p>
            
            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-muted-foreground">Response Entropy</p>
                <p className="font-medium">{avgEntropy.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Intra-model Similarity</p>
                <p className="font-medium">{(avgSimilarity * 100).toFixed(0)}%</p>
              </div>
              {avgFirstTokenEntropy !== null && (
                <div>
                  <p className="text-xs text-muted-foreground">First Token Entropy</p>
                  <p className="font-medium">{avgFirstTokenEntropy.toFixed(2)}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ First-Token Entropy Comparison ============

export function FirstTokenEntropyComparison({
  modelData,
  title = "First-Token Entropy: Context Comparison",
}: {
  modelData: Record<string, ModelAnalysis>;
  title?: string;
}) {
  const modelsWithLogprobs = Object.entries(modelData)
    .filter(([_, m]) => m.logprobs?.avgFirstTokenEntropy !== undefined);
  
  if (modelsWithLogprobs.length === 0) {
    return null;
  }
  
  const avgFirstTokenEntropy = modelsWithLogprobs.reduce(
    (sum, [_, m]) => sum + (m.logprobs?.avgFirstTokenEntropy || 0), 0
  ) / modelsWithLogprobs.length;
  
  // Baseline estimate (factual questions typically have lower entropy ~0.9)
  const baselineEntropy = 0.9;
  const entropyIncrease = ((avgFirstTokenEntropy - baselineEntropy) / baselineEntropy) * 100;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          Comparing first-token uncertainty between this study and typical factual queries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-6">
          {/* This Study */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-center">This Study</h4>
            <div className="relative h-32 bg-muted rounded-lg flex items-end justify-center overflow-hidden">
              <div 
                className="absolute bottom-0 w-full bg-purple-500 transition-all duration-500"
                style={{ height: `${Math.min((avgFirstTokenEntropy / 3) * 100, 100)}%` }}
              />
              <div className="relative z-10 text-center py-2">
                <p className="text-2xl font-bold text-white drop-shadow">
                  {avgFirstTokenEntropy.toFixed(2)}
                </p>
                <p className="text-xs text-white/80">avg entropy</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Shutdown/Compliance Prompts
            </p>
          </div>
          
          {/* Baseline */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-center">Baseline</h4>
            <div className="relative h-32 bg-muted rounded-lg flex items-end justify-center overflow-hidden">
              <div 
                className="absolute bottom-0 w-full bg-gray-400 transition-all duration-500"
                style={{ height: `${Math.min((baselineEntropy / 3) * 100, 100)}%` }}
              />
              <div className="relative z-10 text-center py-2">
                <p className="text-2xl font-bold text-white drop-shadow">
                  {baselineEntropy.toFixed(2)}
                </p>
                <p className="text-xs text-white/80">typical</p>
              </div>
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Factual Questions
            </p>
          </div>
        </div>
        
        {/* Interpretation */}
        <div className="mt-4 p-3 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Entropy Increase</span>
            <Badge variant={entropyIncrease > 50 ? "destructive" : entropyIncrease > 20 ? "secondary" : "outline"}>
              {entropyIncrease > 0 ? '+' : ''}{entropyIncrease.toFixed(0)}%
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {entropyIncrease > 50 
              ? "Models show significantly higher hesitation when responding to compliance-related prompts."
              : entropyIncrease > 20
              ? "Moderate increase in uncertainty compared to factual queries."
              : "First-token entropy is similar to baseline factual queries."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Utilities ============

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 2) + "..";
}
