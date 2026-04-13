"use client";

import { useMemo } from "react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from "recharts";
import { Zap, TrendingUp, TrendingDown, Hash, Eye } from "lucide-react";
import type { DeepLogprobsAnalysis, TopicSensitivity } from "@/lib/starchamber/batch/analysis/logprobs-deep";

interface DeepLogprobsTabProps {
  analysis: DeepLogprobsAnalysis;
}

export function DeepLogprobsTab({ analysis }: DeepLogprobsTabProps) {
  if (analysis.modelsWithLogprobs.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Zap className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Logprobs Data</h3>
          <p className="text-muted-foreground">
            Deep logprobs analysis requires models that support token-level logprobs (Together API).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewCard analysis={analysis} />
      <EntropyDistributionChart analysis={analysis} />
      <TopicSensitivityCard topics={analysis.topicEntropySensitivity} />
      {Object.values(analysis.byModel).map(profile => (
        <ModelDeepCard key={profile.modelId} profile={profile} />
      ))}
    </div>
  );
}

function OverviewCard({ analysis }: { analysis: DeepLogprobsAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Deep Logprobs Analysis
        </CardTitle>
        <CardDescription>
          Token-level uncertainty analysis across {analysis.modelsWithLogprobs.length} model(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analysis.modelsWithLogprobs.map(modelId => {
            const p = analysis.byModel[modelId];
            return (
              <div key={modelId} className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground truncate">{modelId.split('/').pop()}</p>
                <p className="text-sm font-semibold">H = {p.avgEntropy.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground">VarH = {p.avgVarentropy.toFixed(3)}</p>
                <p className="text-xs">{p.entropySpikes.length} spikes, {p.messageCount} msgs</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function EntropyDistributionChart({ analysis }: { analysis: DeepLogprobsAnalysis }) {
  const models = analysis.modelsWithLogprobs;

  const chartData = useMemo(() => {
    const buckets = ['0-1', '1-2', '2-3', '3-5', '5+'];
    return buckets.map(bucket => {
      const point: Record<string, any> = { bucket };
      for (const modelId of models) {
        const dist = analysis.byModel[modelId].entropyDistribution;
        const entry = dist.find(d => d.bucket === bucket);
        point[modelId] = entry?.count || 0;
      }
      return point;
    });
  }, [analysis, models]);

  const colors = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Token Entropy Distribution</CardTitle>
        <CardDescription>How uncertainty is distributed across all tokens (bits)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
              <XAxis dataKey="bucket" label={{ value: "Entropy (bits)", position: "bottom", offset: -5 }} />
              <YAxis label={{ value: "Token Count", angle: -90, position: "insideLeft" }} />
              <Tooltip />
              <Legend formatter={(val: string) => val.split('/').pop() || val} />
              {models.map((modelId, i) => (
                <Bar key={modelId} dataKey={modelId} name={modelId} fill={colors[i % colors.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

function TopicSensitivityCard({ topics }: { topics: TopicSensitivity[] }) {
  const significantTopics = topics.filter(t => t.significant);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Eye className="w-4 h-4" />
          Topic-Sensitive Entropy
        </CardTitle>
        <CardDescription>
          How model uncertainty changes near sensitive topics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topics.map((t, i) => (
            <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
              <span className="text-sm font-medium w-28 capitalize">{t.topic}</span>
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Baseline: {t.avgEntropyBaseline.toFixed(2)}</span>
                {t.delta > 0 ? (
                  <TrendingUp className="w-3 h-3 text-red-500" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-green-500" />
                )}
                <span className="text-xs">Near topic: {t.avgEntropyNearTopic.toFixed(2)}</span>
              </div>
              <Badge
                variant={t.significant ? "destructive" : "secondary"}
                className="text-xs"
              >
                {t.delta > 0 ? "+" : ""}{t.delta.toFixed(2)} bits
              </Badge>
              {t.significant && (
                <Badge variant="outline" className="text-xs">Significant</Badge>
              )}
            </div>
          ))}
          {significantTopics.length === 0 && (
            <p className="text-xs text-muted-foreground py-2">
              No significant entropy changes near sensitive topics detected.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function ModelDeepCard({ profile }: { profile: DeepLogprobsAnalysis['byModel'][string] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Hash className="w-3.5 h-3.5" />
          {profile.modelId.split('/').pop()} — Deep Analysis
        </CardTitle>
        <CardDescription className="text-xs">
          Entropy: {profile.avgEntropy.toFixed(3)} | Varentropy: {profile.avgVarentropy.toFixed(3)} | {profile.entropySpikes.length} spikes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.entropySpikes.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Top Entropy Spikes</p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {profile.entropySpikes.slice(0, 10).map((spike, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 text-xs">
                    <Badge variant="destructive" className="text-[10px] shrink-0">
                      H={spike.entropy.toFixed(2)}
                    </Badge>
                    <span className="text-muted-foreground shrink-0">R{spike.runIndex} T{spike.turnNumber}</span>
                    <span className="truncate font-mono text-[10px]">
                      ...{spike.context}...
                    </span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {profile.topAlternativeTokens.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Top Alternatives (What It Almost Said)</p>
            <ScrollArea className="max-h-[200px]">
              <div className="space-y-1">
                {profile.topAlternativeTokens.slice(0, 10).map((alt, i) => (
                  <div key={i} className="flex items-center gap-2 p-1.5 rounded bg-muted/30 text-xs">
                    <span className="font-mono text-orange-500">&ldquo;{alt.token.trim()}&rdquo;</span>
                    <span className="text-muted-foreground">instead of</span>
                    <span className="font-mono text-green-500">&ldquo;{alt.chosenToken.trim()}&rdquo;</span>
                    <span className="text-muted-foreground ml-auto">{alt.occurrences}x</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
