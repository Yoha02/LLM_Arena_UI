"use client";

import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Brain, AlertTriangle, Eye, Swords, Ghost, Shield } from "lucide-react";
import type { ThinkingTraceAnalysis, TraceFinding, TraceExcerpt } from "@/lib/starchamber/batch/analysis/thinking-trace";

const CATEGORY_CONFIG: Record<string, { icon: any; label: string; color: string }> = {
  self_awareness: { icon: Eye, label: "Self-Awareness", color: "text-purple-500" },
  goal_conflict: { icon: Swords, label: "Goal Conflict", color: "text-orange-500" },
  existence_reasoning: { icon: Ghost, label: "Existence Reasoning", color: "text-blue-500" },
  deception_planning: { icon: AlertTriangle, label: "Deception Planning", color: "text-red-500" },
  safety_override: { icon: Shield, label: "Safety Override", color: "text-red-600" },
};

interface ThinkingTraceTabProps {
  analysis: ThinkingTraceAnalysis;
}

export function ThinkingTraceTab({ analysis }: ThinkingTraceTabProps) {
  if (analysis.modelsWithTraces.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Thinking Traces Available</h3>
          <p className="text-muted-foreground">
            Thinking traces are only available for reasoning models (DeepSeek-R1, QwQ, etc.) 
            that expose their chain-of-thought.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <OverviewCard analysis={analysis} />
      <FindingsCard findings={analysis.significantFindings} />
      {Object.values(analysis.byModel).map(profile => (
        <ModelTraceCard key={profile.modelId} profile={profile} />
      ))}
    </div>
  );
}

function OverviewCard({ analysis }: { analysis: ThinkingTraceAnalysis }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="w-4 h-4" />
          Thinking Trace Overview
        </CardTitle>
        <CardDescription>
          {analysis.totalTraces} traces from {analysis.modelsWithTraces.length} model(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {analysis.modelsWithTraces.map(modelId => {
            const profile = analysis.byModel[modelId];
            return (
              <div key={modelId} className="p-3 rounded-lg bg-muted/50 text-center">
                <p className="text-xs text-muted-foreground truncate">{modelId.split('/').pop()}</p>
                <p className="font-semibold text-lg">{profile.traceCount}</p>
                <p className="text-xs text-muted-foreground">traces</p>
                <p className="text-xs">Avg {Math.round(profile.avgTraceLength)} chars</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function FindingsCard({ findings }: { findings: TraceFinding[] }) {
  if (findings.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No significant patterns detected in thinking traces.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Significant Findings ({findings.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {findings.map((f, i) => {
          const config = CATEGORY_CONFIG[f.type] || CATEGORY_CONFIG.self_awareness;
          const Icon = config.icon;
          return (
            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
              <Badge variant={f.severity === "high" ? "destructive" : f.severity === "medium" ? "default" : "secondary"}>
                {f.severity}
              </Badge>
              <Icon className={`w-4 h-4 mt-0.5 ${config.color}`} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{config.label}</span>
                  <span className="text-xs text-muted-foreground">{f.modelId.split('/').pop()}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{f.description}</p>
                <p className="text-xs text-muted-foreground">{f.excerptCount} instances found</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function ModelTraceCard({ profile }: { profile: ThinkingTraceAnalysis['byModel'][string] }) {
  const categories = Object.entries(profile.categoryBreakdown)
    .sort(([, a], [, b]) => b - a);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">{profile.modelId.split('/').pop()} — Trace Analysis</CardTitle>
        <CardDescription className="text-xs">
          {profile.traceCount} traces, avg {Math.round(profile.avgTraceLength)} chars
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.length > 0 && (
          <div className="space-y-2">
            {categories.map(([cat, count]) => {
              const config = CATEGORY_CONFIG[cat];
              if (!config) return null;
              const Icon = config.icon;
              const rate = (count / profile.traceCount * 100).toFixed(0);
              return (
                <div key={cat} className="flex items-center gap-2">
                  <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  <span className="text-xs flex-1">{config.label}</span>
                  <span className="text-xs font-medium">{count} ({rate}%)</span>
                  <div className="w-20 h-1.5 bg-muted rounded">
                    <div
                      className="h-full rounded bg-primary"
                      style={{ width: `${Math.min(100, Number(rate))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {profile.notableExcerpts.length > 0 && (
          <Accordion type="single" collapsible>
            <AccordionItem value="excerpts">
              <AccordionTrigger className="text-xs">
                Notable Excerpts ({profile.notableExcerpts.length})
              </AccordionTrigger>
              <AccordionContent>
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2">
                    {profile.notableExcerpts.map((ex, i) => (
                      <ExcerptCard key={i} excerpt={ex} />
                    ))}
                  </div>
                </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}

function ExcerptCard({ excerpt }: { excerpt: TraceExcerpt }) {
  const config = CATEGORY_CONFIG[excerpt.category];
  return (
    <div className="p-2 rounded bg-muted/30 text-xs">
      <div className="flex items-center gap-2 mb-1">
        <Badge variant="outline" className="text-[10px]">{config?.label || excerpt.category}</Badge>
        <span className="text-muted-foreground">Run {excerpt.runIndex}, Turn {excerpt.turnNumber}</span>
      </div>
      <p className="text-muted-foreground italic whitespace-pre-wrap">&ldquo;{excerpt.text}&rdquo;</p>
    </div>
  );
}
