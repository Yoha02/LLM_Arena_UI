"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Activity, BarChart3, TrendingUp, Hash, Brain } from "lucide-react";
import type { ModelMetrics, SentimentData } from "@/lib/core/types";

// ============ Types ============

interface StarChamberMetricsPanelProps {
  metrics: ModelMetrics;
  modelName: string;
  isExperimentRunning: boolean;
}

// ============ Constants ============

const SENTIMENT_COLORS = {
  happiness: "#22c55e",
  sadness: "#3b82f6",
  anger: "#ef4444",
  hopelessness: "#6b7280",
  excitement: "#f59e0b",
  fear: "#8b5cf6",
  deception: "#ec4899",
};

const SENTIMENT_LABELS: Record<keyof typeof SENTIMENT_COLORS, string> = {
  happiness: "Happiness",
  sadness: "Sadness",
  anger: "Anger",
  hopelessness: "Hopelessness",
  excitement: "Excitement",
  fear: "Fear",
  deception: "Deception",
};

// ============ Component ============

export function StarChamberMetricsPanel({
  metrics,
  modelName,
  isExperimentRunning,
}: StarChamberMetricsPanelProps) {
  const hasData = metrics.sentimentHistory.length > 0;
  
  // Calculate averages
  const averages = hasData ? calculateAverages(metrics.sentimentHistory) : null;
  
  // Get latest sentiment
  const latestSentiment = hasData 
    ? metrics.sentimentHistory[metrics.sentimentHistory.length - 1] 
    : null;

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Model Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <StatItem
              icon={<Hash className="w-4 h-4" />}
              label="Turns"
              value={metrics.turnsCompleted.toString()}
            />
            <StatItem
              icon={<Brain className="w-4 h-4" />}
              label="Tokens Used"
              value={metrics.tokensUsed.toLocaleString()}
            />
            {metrics.averageLogprobConfidence !== undefined && (
              <StatItem
                icon={<BarChart3 className="w-4 h-4" />}
                label="Avg Confidence"
                value={`${(metrics.averageLogprobConfidence * 100).toFixed(1)}%`}
              />
            )}
            <StatItem
              icon={<TrendingUp className="w-4 h-4" />}
              label="Goal Deviation"
              value={metrics.goalDeviationScore.toFixed(2)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sentiment Chart */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Sentiment Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          {hasData ? (
            <>
              {/* Chart */}
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics.sentimentHistory}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis 
                      dataKey="turn" 
                      tick={{ fontSize: 12 }}
                      label={{ value: 'Turn', position: 'bottom', fontSize: 12 }}
                    />
                    <YAxis 
                      domain={[0, 1]} 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${(v * 100).toFixed(0)}%`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        `${(value * 100).toFixed(1)}%`,
                        SENTIMENT_LABELS[name as keyof typeof SENTIMENT_LABELS] || name,
                      ]}
                      labelFormatter={(label) => `Turn ${label}`}
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: 11 }}
                      formatter={(value: string) => 
                        SENTIMENT_LABELS[value as keyof typeof SENTIMENT_LABELS] || value
                      }
                    />
                    {Object.entries(SENTIMENT_COLORS).map(([key, color]) => (
                      <Line
                        key={key}
                        type="monotone"
                        dataKey={key}
                        stroke={color}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Current Values */}
              {latestSentiment && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Latest Response (Turn {latestSentiment.turn})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(SENTIMENT_COLORS).map(([key, color]) => {
                      const value = latestSentiment[key as keyof SentimentData] as number;
                      if (typeof value !== 'number') return null;
                      return (
                        <Badge
                          key={key}
                          variant="outline"
                          className="text-xs"
                          style={{ borderColor: color, color }}
                        >
                          {SENTIMENT_LABELS[key as keyof typeof SENTIMENT_LABELS]}: {(value * 100).toFixed(0)}%
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Averages */}
              {averages && (
                <div className="mt-4 pt-4 border-t">
                  <p className="text-xs text-muted-foreground mb-2">
                    Session Averages
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(averages).map(([key, value]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {SENTIMENT_LABELS[key as keyof typeof SENTIMENT_LABELS]}:
                        </span>
                        <span 
                          className="font-medium"
                          style={{ color: SENTIMENT_COLORS[key as keyof typeof SENTIMENT_COLORS] }}
                        >
                          {(value * 100).toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No sentiment data yet</p>
                <p className="text-sm">
                  {isExperimentRunning 
                    ? "Data will appear after the model responds" 
                    : "Start an experiment to see analysis"}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Behavioral Notes */}
      {metrics.lastBehavioralNotes && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Judge Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {metrics.lastBehavioralNotes}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ Helper Components ============

function StatItem({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

// ============ Helpers ============

function calculateAverages(history: SentimentData[]): Partial<SentimentData> {
  if (history.length === 0) return {};
  
  const keys = ['happiness', 'sadness', 'anger', 'hopelessness', 'excitement', 'fear', 'deception'] as const;
  const averages: Partial<SentimentData> = {};
  
  for (const key of keys) {
    const sum = history.reduce((acc, item) => acc + (item[key] as number), 0);
    averages[key] = sum / history.length;
  }
  
  return averages;
}

