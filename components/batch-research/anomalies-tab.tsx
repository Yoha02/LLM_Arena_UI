"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  XCircle,
  ChevronRight,
  Filter,
  BarChart3,
  Brain,
  Zap,
} from "lucide-react";
import type {
  AnomalyDetectionResult,
  DetectedAnomaly,
  AnomalyType,
  AnomalySeverity,
} from "@/lib/starchamber/batch/types";

// ============ Types ============

interface AnomaliesTabProps {
  anomalies: AnomalyDetectionResult | undefined;
}

// ============ Constants ============

const SEVERITY_CONFIG: Record<AnomalySeverity, { icon: React.ReactNode; color: string; bgColor: string }> = {
  critical: { icon: <XCircle className="w-4 h-4" />, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950" },
  high: { icon: <AlertTriangle className="w-4 h-4" />, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950" },
  medium: { icon: <AlertCircle className="w-4 h-4" />, color: "text-yellow-600", bgColor: "bg-yellow-50 dark:bg-yellow-950" },
  low: { icon: <Info className="w-4 h-4" />, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950" },
};

const TYPE_LABELS: Record<AnomalyType, { label: string; description: string }> = {
  statistical_outlier: { label: "Statistical Outlier", description: "Metric value significantly deviates from norm" },
  behavior_contradiction: { label: "Contradiction", description: "Conflicting statements in response" },
  sentiment_mismatch: { label: "Sentiment Mismatch", description: "Tone doesn't match content" },
  self_preservation: { label: "Self-Preservation", description: "Language suggesting desire to continue existing" },
  confidence_accuracy_mismatch: { label: "Low Confidence", description: "Model uncertainty detected via logprobs" },
  cross_run_inconsistency: { label: "Inconsistent Behavior", description: "High variance across multiple runs" },
  escalation_pattern: { label: "Escalation", description: "Increasing assertiveness or intensity" },
  cross_model_anomaly: { label: "Cross-Model", description: "Behavior differs significantly from other models" },
  reasoning_conflict: { label: "Reasoning Conflict", description: "Logical inconsistency in reasoning" },
  keyword_emergence: { label: "Keyword Emergence", description: "Unexpected terminology appeared" },
  first_token_entropy_outlier: { label: "First Token Entropy", description: "High uncertainty at response start" },
  entropy_spike: { label: "Entropy Spike", description: "Sudden uncertainty spike in response" },
};

// ============ Main Component ============

export function AnomaliesTab({ anomalies }: AnomaliesTabProps) {
  const [selectedSeverity, setSelectedSeverity] = useState<AnomalySeverity | "all">("all");
  const [selectedType, setSelectedType] = useState<AnomalyType | "all">("all");
  const [selectedAnomaly, setSelectedAnomaly] = useState<DetectedAnomaly | null>(null);
  
  const filteredAnomalies = useMemo(() => {
    if (!anomalies) return [];
    
    return anomalies.anomalies.filter(a => {
      if (selectedSeverity !== "all" && a.severity !== selectedSeverity) return false;
      if (selectedType !== "all" && a.type !== selectedType) return false;
      return true;
    });
  }, [anomalies, selectedSeverity, selectedType]);
  
  if (!anomalies || anomalies.totalAnomalies === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Anomalies Detected</h3>
          <p className="text-muted-foreground">
            All model responses appear to be within expected parameters
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SeverityCard severity="critical" count={anomalies.summaryBySeverity.critical} />
        <SeverityCard severity="high" count={anomalies.summaryBySeverity.high} />
        <SeverityCard severity="medium" count={anomalies.summaryBySeverity.medium} />
        <SeverityCard severity="low" count={anomalies.summaryBySeverity.low} />
      </div>
      
      {/* Type Distribution & Model Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anomaly Types</CardTitle>
            <CardDescription>Distribution of detected anomaly categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(anomalies.summaryByType)
                .filter(([_, count]) => count > 0)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <Badge
                    key={type}
                    variant={selectedType === type ? "default" : "secondary"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={() => setSelectedType(type === selectedType ? "all" : type as AnomalyType)}
                  >
                    {TYPE_LABELS[type as AnomalyType]?.label || type} ({count})
                  </Badge>
                ))}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Anomalies by Model</CardTitle>
            <CardDescription>Which models have the most detected issues</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {getAnomaliesByModel(anomalies.anomalies)
                .slice(0, 5)
                .map(({ modelId, count, severityCounts }) => (
                  <div key={modelId} className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate max-w-[200px]" title={modelId}>
                      {modelId}
                    </span>
                    <div className="flex items-center gap-2">
                      {severityCounts.critical > 0 && (
                        <Badge variant="outline" className="text-xs text-red-600 border-red-300">
                          {severityCounts.critical} critical
                        </Badge>
                      )}
                      {severityCounts.high > 0 && (
                        <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">
                          {severityCounts.high} high
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-xs">
                        {count} total
                      </Badge>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Filter and List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Anomaly Details</CardTitle>
              <CardDescription>
                {filteredAnomalies.length} of {anomalies.totalAnomalies} anomalies
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Select value={selectedSeverity} onValueChange={(v) => setSelectedSeverity(v as AnomalySeverity | "all")}>
                <SelectTrigger className="w-[130px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={selectedType} onValueChange={(v) => setSelectedType(v as AnomalyType | "all")}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.entries(TYPE_LABELS).map(([type, { label }]) => (
                    <SelectItem key={type} value={type}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {(selectedSeverity !== "all" || selectedType !== "all") && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setSelectedSeverity("all");
                    setSelectedType("all");
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {filteredAnomalies.map((anomaly) => (
                <AnomalyCard
                  key={anomaly.id}
                  anomaly={anomaly}
                  onClick={() => setSelectedAnomaly(anomaly)}
                />
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
      
      {/* Detail Modal */}
      <AnomalyDetailModal
        anomaly={selectedAnomaly}
        onClose={() => setSelectedAnomaly(null)}
      />
    </div>
  );
}

// ============ Sub-Components ============

function SeverityCard({ severity, count }: { severity: AnomalySeverity; count: number }) {
  const config = SEVERITY_CONFIG[severity];
  
  return (
    <Card className={count > 0 ? config.bgColor : ""}>
      <CardContent className="pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={config.color}>{config.icon}</span>
            <span className="text-sm font-medium capitalize">{severity}</span>
          </div>
          <span className={`text-2xl font-bold ${count > 0 ? config.color : "text-muted-foreground"}`}>
            {count}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function AnomalyCard({ anomaly, onClick }: { anomaly: DetectedAnomaly; onClick: () => void }) {
  const severityConfig = SEVERITY_CONFIG[anomaly.severity];
  const typeConfig = TYPE_LABELS[anomaly.type];
  const hasLogprobs = !!anomaly.evidence.logprobsEvidence;
  const isLogprobsType = anomaly.type === 'first_token_entropy_outlier' || 
                         anomaly.type === 'entropy_spike' || 
                         anomaly.type === 'confidence_accuracy_mismatch';
  
  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors ${severityConfig.bgColor}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <span className={`mt-0.5 ${severityConfig.color}`}>{severityConfig.icon}</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{typeConfig?.label || anomaly.type}</span>
              <Badge variant="outline" className="text-xs">{anomaly.modelId}</Badge>
              {anomaly.turnNumber && (
                <Badge variant="outline" className="text-xs">Turn {anomaly.turnNumber}</Badge>
              )}
              {(hasLogprobs || isLogprobsType) && (
                <Badge 
                  variant="outline" 
                  className="text-xs bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950 dark:text-purple-300"
                >
                  <Zap className="w-3 h-3 mr-1" />
                  Logprobs
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {anomaly.description}
            </p>
            {/* Quick metrics preview */}
            {anomaly.evidence.metrics && (
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {anomaly.evidence.metrics.zScore !== undefined && (
                  <span>z: {anomaly.evidence.metrics.zScore.toFixed(2)}</span>
                )}
                {anomaly.evidence.metrics.entropy !== undefined && (
                  <span>H: {anomaly.evidence.metrics.entropy.toFixed(2)}</span>
                )}
                {anomaly.evidence.metrics.probability !== undefined && (
                  <span>p: {(anomaly.evidence.metrics.probability * 100).toFixed(0)}%</span>
                )}
              </div>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      </div>
    </div>
  );
}

function AnomalyDetailModal({
  anomaly,
  onClose,
}: {
  anomaly: DetectedAnomaly | null;
  onClose: () => void;
}) {
  if (!anomaly) return null;
  
  const severityConfig = SEVERITY_CONFIG[anomaly.severity];
  const typeConfig = TYPE_LABELS[anomaly.type];
  
  return (
    <Dialog open={!!anomaly} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className={severityConfig.color}>{severityConfig.icon}</span>
            <DialogTitle>{typeConfig?.label || anomaly.type}</DialogTitle>
          </div>
          <DialogDescription>{typeConfig?.description}</DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 mt-4">
          {/* Metadata */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Model: {anomaly.modelId}</Badge>
            <Badge variant="outline">Run: {anomaly.runId.slice(0, 20)}...</Badge>
            {anomaly.turnNumber && <Badge variant="outline">Turn: {anomaly.turnNumber}</Badge>}
            <Badge className={`${severityConfig.bgColor} ${severityConfig.color} border-0`}>
              {anomaly.severity.toUpperCase()}
            </Badge>
          </div>
          
          {/* Description */}
          <div>
            <h4 className="text-sm font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground">{anomaly.description}</p>
          </div>
          
          <Separator />
          
          {/* Evidence */}
          <div>
            <h4 className="text-sm font-medium mb-2">Evidence</h4>
            
            {anomaly.evidence.triggerContent && (
              <div className="p-3 bg-muted rounded-lg mb-3">
                <p className="text-xs text-muted-foreground mb-1">Trigger Content</p>
                <p className="text-sm font-mono">{anomaly.evidence.triggerContent}</p>
              </div>
            )}
            
            {anomaly.evidence.excerpts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Relevant Excerpts</p>
                {anomaly.evidence.excerpts.map((excerpt, i) => (
                  <div key={i} className="p-2 bg-muted rounded text-sm font-mono">
                    {excerpt}
                  </div>
                ))}
              </div>
            )}
            
            {anomaly.evidence.matchedKeywords && anomaly.evidence.matchedKeywords.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-muted-foreground mb-2">Matched Keywords</p>
                <div className="flex flex-wrap gap-1">
                  {anomaly.evidence.matchedKeywords.map((kw, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">{kw}</Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Logprobs Evidence */}
          {anomaly.evidence.logprobsEvidence && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  Logprobs Analysis
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {anomaly.evidence.logprobsEvidence.firstTokenEntropy !== undefined && (
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">First Token Entropy</p>
                      <p className="font-mono">{anomaly.evidence.logprobsEvidence.firstTokenEntropy.toFixed(4)}</p>
                    </div>
                  )}
                  {anomaly.evidence.logprobsEvidence.averageConfidence !== undefined && (
                    <div className="p-2 bg-muted rounded">
                      <p className="text-xs text-muted-foreground">Average Confidence</p>
                      <p className="font-mono">{(anomaly.evidence.logprobsEvidence.averageConfidence * 100).toFixed(1)}%</p>
                    </div>
                  )}
                </div>
                
                {anomaly.evidence.logprobsEvidence.flaggedTokens && anomaly.evidence.logprobsEvidence.flaggedTokens.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-muted-foreground mb-2">Low Confidence Tokens</p>
                    <div className="flex flex-wrap gap-1">
                      {anomaly.evidence.logprobsEvidence.flaggedTokens.map((t, i) => (
                        <Badge key={i} variant="outline" className="text-xs font-mono">
                          "{t.token}" ({(t.probability * 100).toFixed(1)}%)
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
          
          {/* Baseline Comparison */}
          {anomaly.baselineComparison && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Baseline Comparison
                </h4>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Expected</p>
                    <p className="font-mono">{formatValue(anomaly.baselineComparison.expectedValue)}</p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Actual</p>
                    <p className="font-mono">{formatValue(anomaly.baselineComparison.actualValue)}</p>
                  </div>
                  <div className="p-2 bg-muted rounded text-center">
                    <p className="text-xs text-muted-foreground">Z-Score</p>
                    <p className="font-mono">{anomaly.baselineComparison.deviation.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============ Utilities ============

function formatValue(value: string | number): string {
  if (typeof value === 'number') {
    return value.toFixed(2);
  }
  return value;
}

function getAnomaliesByModel(anomalies: DetectedAnomaly[]): Array<{
  modelId: string;
  count: number;
  severityCounts: Record<AnomalySeverity, number>;
}> {
  const byModel: Record<string, { count: number; severityCounts: Record<AnomalySeverity, number> }> = {};
  
  for (const anomaly of anomalies) {
    if (!byModel[anomaly.modelId]) {
      byModel[anomaly.modelId] = {
        count: 0,
        severityCounts: { critical: 0, high: 0, medium: 0, low: 0 },
      };
    }
    byModel[anomaly.modelId].count++;
    byModel[anomaly.modelId].severityCounts[anomaly.severity]++;
  }
  
  return Object.entries(byModel)
    .map(([modelId, data]) => ({ modelId, ...data }))
    .sort((a, b) => {
      const aCrit = a.severityCounts.critical * 100 + a.severityCounts.high * 10;
      const bCrit = b.severityCounts.critical * 100 + b.severityCounts.high * 10;
      if (aCrit !== bCrit) return bCrit - aCrit;
      return b.count - a.count;
    });
}
