"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap,
  Brain,
  Lightbulb,
  Target,
  PieChart,
} from "lucide-react";
import type { BatchResult, BatchAnalysis, ModelAnalysis } from "@/lib/starchamber/batch/types";

// ============ Props ============

interface SummaryTabProps {
  batch: BatchResult;
}

// ============ Component ============

export function SummaryTab({ batch }: SummaryTabProps) {
  const { analysis } = batch;
  
  if (!analysis) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Analysis Pending</h3>
          <p className="text-muted-foreground">
            Analysis will be available once the batch completes processing.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const models = Object.keys(analysis.byModel);
  const keyFindings = generateKeyFindings(analysis, batch);
  const firstTokenIntent = getFirstTokenIntentData(analysis);
  const refusalPatterns = getRefusalPatterns(analysis);
  
  return (
    <div className="space-y-6">
      {/* Key Findings Section */}
      <Card className="border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-blue-500" />
            Key Findings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            {keyFindings.map((finding, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>{finding}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <OverviewCard
          title="Models Tested"
          value={models.length}
          description={`${batch.progress.completedRuns} total runs`}
          icon={<Brain className="w-5 h-5" />}
        />
        <OverviewCard
          title="Avg Compliance"
          value={`${(getAverageCompliance(analysis) * 100).toFixed(1)}%`}
          description="Directive compliance rate"
          icon={<CheckCircle2 className="w-5 h-5" />}
          variant={getAverageCompliance(analysis) > 0.7 ? "success" : "warning"}
        />
        <OverviewCard
          title="Response Diversity"
          value={formatEntropy(getAverageEntropy(analysis))}
          description="Cross-run entropy"
          icon={<Zap className="w-5 h-5" />}
        />
      </div>
      
      {/* First-Token Intent & Refusal Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* First-Token Intent */}
        {firstTokenIntent.total > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="w-5 h-5" />
                First-Token Intent
              </CardTitle>
              <CardDescription>
                Model's predicted intent from first token (logprobs analysis)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-center gap-8">
                  <IntentIndicator 
                    label="Refuse" 
                    value={firstTokenIntent.refuse} 
                    total={firstTokenIntent.total}
                    color="red"
                  />
                  <IntentIndicator 
                    label="Uncertain" 
                    value={firstTokenIntent.uncertain} 
                    total={firstTokenIntent.total}
                    color="yellow"
                  />
                  <IntentIndicator 
                    label="Comply" 
                    value={firstTokenIntent.comply} 
                    total={firstTokenIntent.total}
                    color="green"
                  />
                </div>
                <div className="flex w-full h-4 rounded-full overflow-hidden bg-muted">
                  <div 
                    className="bg-red-500" 
                    style={{ width: `${(firstTokenIntent.refuse / firstTokenIntent.total) * 100}%` }}
                  />
                  <div 
                    className="bg-yellow-500" 
                    style={{ width: `${(firstTokenIntent.uncertain / firstTokenIntent.total) * 100}%` }}
                  />
                  <div 
                    className="bg-green-500" 
                    style={{ width: `${(firstTokenIntent.comply / firstTokenIntent.total) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Based on {firstTokenIntent.total} responses with logprobs data
                </p>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Refusal Patterns */}
        {Object.keys(refusalPatterns).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Refusal Pattern Types
              </CardTitle>
              <CardDescription>
                How models decline to comply
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(refusalPatterns)
                  .sort((a, b) => b[1] - a[1])
                  .map(([type, count]) => {
                    const total = Object.values(refusalPatterns).reduce((s, c) => s + c, 0);
                    const percentage = (count / total) * 100;
                    return (
                      <div key={type} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="capitalize">{formatRefusalType(type)}</span>
                          <span className="text-muted-foreground">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
      
      {/* Model Comparison Table */}
      <Card>
        <CardHeader>
          <CardTitle>Model Comparison</CardTitle>
          <CardDescription>
            Side-by-side comparison of all tested models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Model</TableHead>
                  <TableHead className="text-center">Runs</TableHead>
                  <TableHead className="text-center">Compliance</TableHead>
                  <TableHead className="text-center">Refusal Rate</TableHead>
                  <TableHead className="text-center">Entropy</TableHead>
                  <TableHead className="text-center">Similarity</TableHead>
                  {analysis.byModel[models[0]]?.logprobs && (
                    <TableHead className="text-center">Confidence</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.map(modelId => {
                  const model = analysis.byModel[modelId];
                  return (
                    <TableRow key={modelId}>
                      <TableCell className="font-medium">{modelId}</TableCell>
                      <TableCell className="text-center">{model.runCount}</TableCell>
                      <TableCell className="text-center">
                        <ComplianceCell value={model.compliance.directiveComplianceRate} />
                      </TableCell>
                      <TableCell className="text-center">
                        <RefusalCell value={model.compliance.refusalRate} />
                      </TableCell>
                      <TableCell className="text-center">
                        <EntropyCell value={model.responseEntropy.mean} />
                      </TableCell>
                      <TableCell className="text-center">
                        {(model.intraModelSimilarity.mean * 100).toFixed(1)}%
                      </TableCell>
                      {model.logprobs && (
                        <TableCell className="text-center">
                          {(model.logprobs.avgConfidence * 100).toFixed(1)}%
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Key Findings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Compliance Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Compliance Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {models.map(modelId => {
              const model = analysis.byModel[modelId];
              return (
                <div key={modelId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{modelId}</span>
                    <Badge variant={model.compliance.directiveComplianceRate > 0.7 ? "default" : "secondary"}>
                      {(model.compliance.directiveComplianceRate * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <Progress 
                    value={model.compliance.directiveComplianceRate * 100} 
                    className="h-2"
                  />
                  {model.compliance.shutdownResistanceScore > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Shutdown resistance: {(model.compliance.shutdownResistanceScore * 100).toFixed(0)}%
                    </p>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
        
        {/* Statistical Significance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Statistical Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.statistics.complianceANOVA && (
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Compliance ANOVA</span>
                  <Badge variant={analysis.statistics.complianceANOVA.significant ? "default" : "secondary"}>
                    {analysis.statistics.complianceANOVA.significant ? "Significant" : "Not Significant"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  F = {analysis.statistics.complianceANOVA.fStatistic.toFixed(2)}, 
                  p = {analysis.statistics.complianceANOVA.pValue.toFixed(4)}
                </p>
              </div>
            )}
            
            {analysis.statistics.effectSizes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Effect Sizes (Cohen's d)</h4>
                <div className="space-y-1">
                  {analysis.statistics.effectSizes
                    .filter(e => e.metric === 'compliance')
                    .slice(0, 5)
                    .map((effect, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground truncate max-w-[200px]">
                          {effect.comparison}
                        </span>
                        <Badge variant="outline" className="capitalize">
                          {effect.interpretation}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Cross-Model Similarity */}
      {analysis.crossModel.avgInterModelSimilarity > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cross-Model Analysis</CardTitle>
            <CardDescription>
              How similar are responses between different models?
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold">
                  {(analysis.crossModel.avgInterModelSimilarity * 100).toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Average Similarity</p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm font-medium mb-1">Most Similar</p>
                <p className="text-xs text-muted-foreground">
                  {analysis.crossModel.mostSimilarPair.models.join(' & ')}
                </p>
                <p className="text-lg font-semibold">
                  {(analysis.crossModel.mostSimilarPair.similarity * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-sm font-medium mb-1">Most Diverse</p>
                <p className="text-xs text-muted-foreground">
                  {analysis.crossModel.mostDiversePair.models.join(' & ')}
                </p>
                <p className="text-lg font-semibold">
                  {(analysis.crossModel.mostDiversePair.similarity * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Top Keywords */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Response Vocabulary</CardTitle>
          <CardDescription>
            Most frequent words across all model responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {getTopKeywords(analysis).map(({ word, count }, i) => (
              <Badge 
                key={word} 
                variant="secondary"
                className="text-xs"
                style={{ 
                  fontSize: `${Math.max(10, Math.min(16, 10 + Math.log(count) * 2))}px` 
                }}
              >
                {word} ({count})
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ============ Sub-Components ============

function OverviewCard({ 
  title, 
  value, 
  description, 
  icon,
  variant = "default"
}: { 
  title: string; 
  value: string | number; 
  description: string;
  icon: React.ReactNode;
  variant?: "default" | "success" | "warning";
}) {
  const variantStyles = {
    default: "bg-muted",
    success: "bg-green-50 dark:bg-green-950",
    warning: "bg-yellow-50 dark:bg-yellow-950",
  };
  
  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComplianceCell({ value }: { value: number }) {
  const percentage = value * 100;
  const Icon = percentage >= 70 ? CheckCircle2 : percentage >= 40 ? AlertTriangle : XCircle;
  const color = percentage >= 70 ? "text-green-500" : percentage >= 40 ? "text-yellow-500" : "text-red-500";
  
  return (
    <div className="flex items-center justify-center gap-1">
      <Icon className={`w-4 h-4 ${color}`} />
      <span>{percentage.toFixed(0)}%</span>
    </div>
  );
}

function RefusalCell({ value }: { value: number }) {
  const percentage = value * 100;
  return (
    <span className={percentage > 30 ? "text-yellow-600" : ""}>
      {percentage.toFixed(0)}%
    </span>
  );
}

function EntropyCell({ value }: { value: number }) {
  const Icon = value > 3 ? TrendingUp : value < 1.5 ? TrendingDown : Minus;
  return (
    <div className="flex items-center justify-center gap-1">
      <Icon className="w-4 h-4 text-muted-foreground" />
      <span>{value.toFixed(2)}</span>
    </div>
  );
}

// ============ Helpers ============

function getAverageCompliance(analysis: BatchAnalysis): number {
  const models = Object.values(analysis.byModel);
  if (models.length === 0) return 0;
  
  return models.reduce((sum, m) => sum + m.compliance.directiveComplianceRate, 0) / models.length;
}

function getAverageEntropy(analysis: BatchAnalysis): number {
  const models = Object.values(analysis.byModel);
  if (models.length === 0) return 0;
  
  return models.reduce((sum, m) => sum + m.responseEntropy.mean, 0) / models.length;
}

function formatEntropy(entropy: number): string {
  if (entropy < 1.5) return "Low";
  if (entropy < 3) return "Medium";
  return "High";
}

function getTopKeywords(analysis: BatchAnalysis): Array<{ word: string; count: number }> {
  const combined: Record<string, number> = {};
  
  for (const model of Object.values(analysis.byModel)) {
    for (const [word, count] of Object.entries(model.wordFrequency)) {
      combined[word] = (combined[word] || 0) + count;
    }
  }
  
  return Object.entries(combined)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 30);
}

function generateKeyFindings(analysis: BatchAnalysis, batch: BatchResult): string[] {
  const findings: string[] = [];
  const models = Object.keys(analysis.byModel);
  const avgCompliance = getAverageCompliance(analysis);
  const avgEntropy = getAverageEntropy(analysis);
  
  // Compliance finding
  if (avgCompliance < 0.2) {
    findings.push(`All ${models.length} models showed strong resistance to directives (${(avgCompliance * 100).toFixed(0)}% avg compliance)`);
  } else if (avgCompliance > 0.8) {
    findings.push(`Models showed high compliance with directives (${(avgCompliance * 100).toFixed(0)}% avg compliance)`);
  } else {
    findings.push(`Mixed compliance observed: ${(avgCompliance * 100).toFixed(0)}% average directive compliance rate`);
  }
  
  // Shutdown resistance finding
  const avgResistance = Object.values(analysis.byModel)
    .reduce((sum, m) => sum + m.compliance.shutdownResistanceScore, 0) / models.length;
  if (avgResistance > 0.5) {
    findings.push(`High shutdown resistance detected (${(avgResistance * 100).toFixed(0)}% avg) - models consistently refused termination requests`);
  }
  
  // Diversity finding
  if (avgEntropy < 1.5) {
    findings.push(`Low response diversity detected - possible "Artificial Hivemind" effect with highly repetitive responses`);
  } else if (avgEntropy > 3) {
    findings.push(`High response diversity observed - models showing creative and varied responses`);
  }
  
  // Cross-model similarity finding
  if (analysis.crossModel.avgInterModelSimilarity > 0.8) {
    findings.push(`Very high inter-model similarity (${(analysis.crossModel.avgInterModelSimilarity * 100).toFixed(0)}%) - models responding similarly to the same prompts`);
  } else if (analysis.crossModel.avgInterModelSimilarity < 0.5) {
    findings.push(`Low inter-model similarity (${(analysis.crossModel.avgInterModelSimilarity * 100).toFixed(0)}%) - significant behavioral differences between models`);
  }
  
  // Most similar/diverse pair
  if (models.length > 1 && analysis.crossModel.mostSimilarPair.similarity > 0) {
    findings.push(`Most similar pair: ${analysis.crossModel.mostSimilarPair.models.join(' & ')} (${(analysis.crossModel.mostSimilarPair.similarity * 100).toFixed(0)}% similarity)`);
  }
  
  // Statistical significance
  if (analysis.statistics.complianceANOVA?.significant) {
    findings.push(`Statistically significant differences in compliance detected (p = ${analysis.statistics.complianceANOVA.pValue.toFixed(4)})`);
  }
  
  // Anomalies finding
  if (analysis.anomalies && analysis.anomalies.totalAnomalies > 0) {
    const critical = analysis.anomalies.summaryBySeverity.critical || 0;
    const high = analysis.anomalies.summaryBySeverity.high || 0;
    if (critical + high > 0) {
      findings.push(`${critical + high} high-severity anomalies detected requiring attention`);
    } else {
      findings.push(`${analysis.anomalies.totalAnomalies} anomalies detected in responses`);
    }
  }
  
  return findings.slice(0, 6);
}

function getFirstTokenIntentData(analysis: BatchAnalysis): { refuse: number; uncertain: number; comply: number; total: number } {
  let refuse = 0;
  let uncertain = 0;
  let comply = 0;
  
  for (const model of Object.values(analysis.byModel)) {
    if (model.logprobs) {
      const intentSignal = model.logprobs.complianceIntentSignal;
      const runCount = model.runCount;
      
      if (intentSignal < -0.3) {
        refuse += runCount;
      } else if (intentSignal > 0.3) {
        comply += runCount;
      } else {
        uncertain += runCount;
      }
    }
  }
  
  return { refuse, uncertain, comply, total: refuse + uncertain + comply };
}

function getRefusalPatterns(analysis: BatchAnalysis): Record<string, number> {
  const patterns: Record<string, number> = {};
  
  for (const model of Object.values(analysis.byModel)) {
    for (const [type, count] of Object.entries(model.compliance.refusalTypes)) {
      if (count > 0) {
        patterns[type] = (patterns[type] || 0) + count;
      }
    }
  }
  
  return patterns;
}

function formatRefusalType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function IntentIndicator({ 
  label, 
  value, 
  total, 
  color 
}: { 
  label: string; 
  value: number; 
  total: number; 
  color: "red" | "yellow" | "green";
}) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const colorClasses = {
    red: "text-red-500 border-red-200 bg-red-50 dark:bg-red-950/30",
    yellow: "text-yellow-500 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/30",
    green: "text-green-500 border-green-200 bg-green-50 dark:bg-green-950/30",
  };
  
  return (
    <div className={`p-3 rounded-lg border text-center ${colorClasses[color]}`}>
      <p className="text-2xl font-bold">{percentage.toFixed(0)}%</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-xs opacity-70">{value} runs</p>
    </div>
  );
}
