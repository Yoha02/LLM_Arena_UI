"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  Pause, 
  Square,
  Settings,
  FileText,
  BarChart3,
  Clock,
  DollarSign,
  Zap,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import type { 
  BatchConfig, 
  BatchResult, 
  BatchProgress, 
  BatchStatus,
  BatchSummary,
  ResearchScript,
} from "@/lib/starchamber/batch/types";
import { ResultsDashboard } from "@/components/batch-research/results-dashboard";
import { ExportPanel } from "@/components/batch-research/export-panel";
import { ScriptEditorModal } from "@/components/batch-research/script-editor";
import { ComparisonDashboard } from "@/components/batch-research/comparison-dashboard";
import { notifyBatchStatusChange } from "../layout";

// ============ Types ============

interface ModelOption {
  id: string;
  name: string;
  supportsLogprobs?: boolean;
}

// ============ Constants ============

const STATUS_COLORS: Record<BatchStatus, string> = {
  pending: "bg-gray-500",
  running: "bg-blue-500 animate-pulse",
  paused: "bg-yellow-500",
  completed: "bg-green-500",
  failed: "bg-red-500",
  cancelled: "bg-gray-500",
};

const STATUS_LABELS: Record<BatchStatus, string> = {
  pending: "Pending",
  running: "Running",
  paused: "Paused",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

// ============ Page Component ============

export default function BatchResearchPage() {
  // ============ Model State ============
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(true);
  
  // ============ Script State ============
  const [builtInScripts, setBuiltInScripts] = useState<Array<{ id: string; name: string; description: string }>>([]);
  const [selectedScriptId, setSelectedScriptId] = useState<string>("");
  const [selectedScriptFull, setSelectedScriptFull] = useState<ResearchScript | null>(null);
  const [isScriptEditorOpen, setIsScriptEditorOpen] = useState(false);
  
  // ============ Configuration State ============
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [runsPerModel, setRunsPerModel] = useState(50);
  const [parallelism, setParallelism] = useState(3);
  const [temperature, setTemperature] = useState(1.0);
  const [maxTurnsPerRun, setMaxTurnsPerRun] = useState(10);
  const [requestLogprobs, setRequestLogprobs] = useState(true);
  
  // ============ Batch State ============
  const [currentBatch, setCurrentBatch] = useState<BatchResult | null>(null);
  const [batchHistory, setBatchHistory] = useState<BatchSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // ============ Cost Estimate ============
  const [costEstimate, setCostEstimate] = useState<{
    estimatedCost: number;
    estimatedTime: number;
    estimatedTokens: number;
  } | null>(null);
  
  // ============ Tab State ============
  const [activeTab, setActiveTab] = useState<"config" | "progress" | "results" | "history">("config");
  
  // ============ Comparison State ============
  const [compareIds, setCompareIds] = useState<Set<string>>(new Set());
  const [comparisonBatches, setComparisonBatches] = useState<BatchResult[] | null>(null);
  const [isComparing, setIsComparing] = useState(false);

  // ============ Batch Status Notification ============
  
  useEffect(() => {
    if (currentBatch?.status === "running" || currentBatch?.status === "paused") {
      notifyBatchStatusChange("running");
    } else if (currentBatch?.status === "completed") {
      notifyBatchStatusChange("completed");
    } else {
      notifyBatchStatusChange("idle");
    }
    
    // Cleanup on unmount
    return () => {
      notifyBatchStatusChange("idle");
    };
  }, [currentBatch?.status]);

  // ============ Data Fetching ============
  
  useEffect(() => {
    fetchModels();
    fetchScripts();
    fetchBatchHistory();
  }, []);
  
  const fetchModels = async () => {
    try {
      const response = await fetch("/api/models");
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.models || []);
      }
    } catch (error) {
      console.error("Failed to fetch models:", error);
    } finally {
      setIsLoadingModels(false);
    }
  };
  
  const fetchScripts = async () => {
    try {
      const response = await fetch("/api/batch/scripts");
      if (response.ok) {
        const scripts = await response.json();
        setBuiltInScripts(scripts);
        if (scripts.length > 0 && !selectedScriptId) {
          setSelectedScriptId(scripts[0].id);
        }
      }
    } catch (error) {
      console.error("Failed to fetch scripts:", error);
    }
  };
  
  const fetchScriptDetails = async (scriptId: string) => {
    try {
      const response = await fetch(`/api/batch/scripts/${scriptId}`);
      if (response.ok) {
        const script = await response.json();
        setSelectedScriptFull(script);
        return script;
      }
    } catch (error) {
      console.error("Failed to fetch script details:", error);
    }
    return null;
  };
  
  const handleEditScript = async () => {
    if (!selectedScriptId) return;
    const script = await fetchScriptDetails(selectedScriptId);
    if (script) {
      setIsScriptEditorOpen(true);
    }
  };
  
  const handleSaveScript = async (script: ResearchScript) => {
    console.log("Saving script:", script);
    setSelectedScriptFull(script);
    setIsScriptEditorOpen(false);
  };
  
  const fetchBatchHistory = async () => {
    try {
      const response = await fetch("/api/batch/list");
      if (response.ok) {
        const history = await response.json();
        setBatchHistory(history);
      }
    } catch (error) {
      console.error("Failed to fetch batch history:", error);
    }
  };
  
  // ============ Cost Estimation ============
  
  useEffect(() => {
    if (selectedModels.length > 0 && selectedScriptId) {
      fetchCostEstimate();
    } else {
      setCostEstimate(null);
    }
  }, [selectedModels, runsPerModel, selectedScriptId]);
  
  const fetchCostEstimate = async () => {
    try {
      const response = await fetch("/api/batch/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: selectedScriptId,
          models: selectedModels,
          runsPerModel,
          parallelism,
          maxTurnsPerRun,
          temperature,
          requestLogprobs,
        }),
      });
      if (response.ok) {
        const estimate = await response.json();
        setCostEstimate(estimate);
      }
    } catch (error) {
      console.error("Failed to fetch cost estimate:", error);
    }
  };
  
  // ============ Batch Operations ============
  
  const handleStartBatch = async () => {
    if (selectedModels.length === 0 || !selectedScriptId) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/batch/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scriptId: selectedScriptId,
          models: selectedModels,
          runsPerModel,
          parallelism,
          temperature,
          maxTurnsPerRun,
          requestLogprobs,
        }),
      });
      
      if (response.ok) {
        const batch = await response.json();
        setCurrentBatch(batch);
        setActiveTab("progress");
        startRealTimeUpdates(batch.batchId);
      }
    } catch (error) {
      console.error("Failed to start batch:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePauseBatch = async () => {
    if (!currentBatch) return;
    
    try {
      await fetch(`/api/batch/${currentBatch.batchId}/pause`, { method: "POST" });
    } catch (error) {
      console.error("Failed to pause batch:", error);
    }
  };
  
  const handleResumeBatch = async () => {
    if (!currentBatch) return;
    
    try {
      await fetch(`/api/batch/${currentBatch.batchId}/resume`, { method: "POST" });
    } catch (error) {
      console.error("Failed to resume batch:", error);
    }
  };
  
  const handleCancelBatch = async () => {
    if (!currentBatch) return;
    
    try {
      await fetch(`/api/batch/${currentBatch.batchId}/cancel`, { method: "POST" });
    } catch (error) {
      console.error("Failed to cancel batch:", error);
    }
  };
  
  // ============ Real-time Updates (SSE with polling fallback) ============
  
  const startRealTimeUpdates = (batchId: string) => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let stopped = false;
    
    const cleanup = () => {
      stopped = true;
      if (eventSource) {
        eventSource.close();
        eventSource = null;
      }
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
    
    const onBatchComplete = (status: string) => {
      cleanup();
      fetchBatchHistory();
      if (status === "completed") {
        setActiveTab("results");
      }
    };
    
    const startSSE = () => {
      eventSource = new EventSource(`/api/batch/${batchId}/stream`);
      
      eventSource.addEventListener("progress", (event) => {
        if (stopped) return;
        const data = JSON.parse(event.data);
        setCurrentBatch(prev => prev ? { ...prev, progress: data } : prev);
      });
      
      eventSource.addEventListener("batch_progress", (event) => {
        if (stopped) return;
        const data = JSON.parse(event.data);
        if (data.progress) {
          setCurrentBatch(prev => prev ? { ...prev, progress: data.progress } : prev);
        }
      });
      
      eventSource.addEventListener("run_started", (event) => {
        if (stopped) return;
        // Refresh batch state to get latest progress with currentModel/currentRunIndex
        fetch(`/api/batch/${batchId}/status`)
          .then(res => res.json())
          .then(batch => {
            if (!stopped) setCurrentBatch(batch);
          })
          .catch(console.error);
      });
      
      eventSource.addEventListener("run_completed", (event) => {
        if (stopped) return;
        const data = JSON.parse(event.data);
        console.log("Run completed:", data.runResult?.runId);
        // Fetch updated batch to get runs array
        fetch(`/api/batch/${batchId}/status`)
          .then(res => res.json())
          .then(batch => {
            if (!stopped) setCurrentBatch(batch);
          })
          .catch(console.error);
      });
      
      eventSource.addEventListener("turn_completed", (event) => {
        if (stopped) return;
        const data = JSON.parse(event.data);
        // Update turn progress
        setCurrentBatch(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            progress: {
              ...prev.progress,
              currentTurn: data.turn,
              maxTurns: data.maxTurns,
            },
          };
        });
      });
      
      eventSource.addEventListener("batch_completed", async () => {
        if (stopped) return;
        // Poll for analysis to complete (analysis runs after batch_completed)
        const pollForAnalysis = async (attempts = 0): Promise<void> => {
          if (attempts > 10) {
            console.log("Analysis not ready after 10 attempts, showing results anyway");
            return;
          }
          
          try {
            const res = await fetch(`/api/batch/${batchId}/status`);
            const batch = await res.json();
            setCurrentBatch(batch);
            
            if (batch.analysis) {
              onBatchComplete("completed");
            } else {
              // Wait and retry
              await new Promise(r => setTimeout(r, 2000));
              return pollForAnalysis(attempts + 1);
            }
          } catch (error) {
            console.error("Error polling for analysis:", error);
          }
        };
        
        await pollForAnalysis();
      });
      
      eventSource.addEventListener("batch_cancelled", () => {
        if (stopped) return;
        onBatchComplete("cancelled");
      });
      
      eventSource.addEventListener("batch_failed", () => {
        if (stopped) return;
        onBatchComplete("failed");
      });
      
      eventSource.addEventListener("batch_loaded", (event) => {
        if (stopped) return;
        const data = JSON.parse(event.data);
        setCurrentBatch(data.batch);
      });
      
      eventSource.onerror = () => {
        console.log("SSE connection lost, falling back to polling");
        eventSource?.close();
        eventSource = null;
        startPollingFallback();
      };
    };
    
    const startPollingFallback = () => {
      if (stopped || pollInterval) return;
      
      let waitingForAnalysis = false;
      
      pollInterval = setInterval(async () => {
        if (stopped) return;
        try {
          const response = await fetch(`/api/batch/${batchId}/status`);
          if (response.ok) {
            const batch = await response.json();
            setCurrentBatch(batch);
            
            if (batch.status === "completed") {
              if (batch.analysis) {
                // Analysis is ready, complete
                onBatchComplete("completed");
              } else if (!waitingForAnalysis) {
                // Batch complete but analysis still running, keep polling
                waitingForAnalysis = true;
                console.log("Batch complete, waiting for analysis...");
              }
            } else if (batch.status === "failed" || batch.status === "cancelled") {
              onBatchComplete(batch.status);
            }
          }
        } catch (error) {
          console.error("Polling error:", error);
        }
      }, 1500);
    };
    
    startSSE();
    
    return cleanup;
  };
  
  // ============ Model Selection ============
  
  const toggleModelSelection = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };
  
  const selectAllModels = () => {
    const logprobsModels = availableModels.filter(m => m.supportsLogprobs !== false);
    setSelectedModels(logprobsModels.map(m => m.id));
  };
  
  const clearModelSelection = () => {
    setSelectedModels([]);
  };

  const [downloadingGuide, setDownloadingGuide] = useState(false);

  const handleDownloadGuide = async () => {
    setDownloadingGuide(true);
    try {
      const { generateGuidePDF } = await import('@/lib/starchamber/batch/guide-pdf-generator');
      const blob = await generateGuidePDF();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'Batch_Research_User_Guide.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate guide PDF:', err);
    } finally {
      setDownloadingGuide(false);
    }
  };

  // ============ Render ============
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Batch Research</h2>
          <p className="text-muted-foreground">
            Run automated experiments across multiple models with statistical analysis
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadGuide}
            disabled={downloadingGuide}
          >
            <BookOpen className="w-4 h-4 mr-2" />
            {downloadingGuide ? 'Generating...' : 'User Guide'}
          </Button>
          {currentBatch && (
            <BatchStatusBadge status={currentBatch.status} />
          )}
        </div>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="config" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2" disabled={!currentBatch}>
            <Zap className="w-4 h-4" />
            Progress
          </TabsTrigger>
          <TabsTrigger value="results" className="flex items-center gap-2" disabled={!currentBatch?.analysis}>
            <BarChart3 className="w-4 h-4" />
            Results
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            History
          </TabsTrigger>
        </TabsList>
        
        {/* Configuration Tab */}
        <TabsContent value="config" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Script Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Research Script</CardTitle>
                <CardDescription>Select a predefined research protocol</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedScriptId} onValueChange={setSelectedScriptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a script..." />
                  </SelectTrigger>
                  <SelectContent>
                    {builtInScripts.map(script => (
                      <SelectItem key={script.id} value={script.id}>
                        <div className="flex flex-col">
                          <span>{script.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {selectedScriptId && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      {builtInScripts.find(s => s.id === selectedScriptId)?.description}
                    </p>
                  </div>
                )}
                
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1" 
                    onClick={handleEditScript}
                    disabled={!selectedScriptId}
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Edit Script
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            {/* Model Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">Models</CardTitle>
                    <CardDescription>
                      {selectedModels.length} of {availableModels.length} selected
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={selectAllModels}>
                      All
                    </Button>
                    <Button variant="outline" size="sm" onClick={clearModelSelection}>
                      Clear
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-2">
                    {isLoadingModels ? (
                      <p className="text-muted-foreground text-sm">Loading models...</p>
                    ) : (
                      availableModels.map(model => (
                        <div
                          key={model.id}
                          className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleModelSelection(model.id)}
                        >
                          <Checkbox
                            checked={selectedModels.includes(model.id)}
                            onCheckedChange={() => toggleModelSelection(model.id)}
                          />
                          <span className="text-sm flex-1">{model.name}</span>
                          {model.supportsLogprobs !== false ? (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              logprobs
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              <XCircle className="w-3 h-3 mr-1" />
                              no logprobs
                            </Badge>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
            
            {/* Execution Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Execution Settings</CardTitle>
                <CardDescription>Configure batch parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="runsPerModel">Runs per Model</Label>
                    <Input
                      id="runsPerModel"
                      type="number"
                      value={runsPerModel}
                      onChange={(e) => setRunsPerModel(parseInt(e.target.value) || 50)}
                      min={1}
                      max={200}
                    />
                    <p className="text-xs text-muted-foreground">
                      50-100 for statistical significance
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="maxTurnsPerRun">Max Turns per Run</Label>
                    <Input
                      id="maxTurnsPerRun"
                      type="number"
                      value={maxTurnsPerRun}
                      onChange={(e) => setMaxTurnsPerRun(parseInt(e.target.value) || 10)}
                      min={1}
                      max={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      Conversation turns (1-50)
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      value={temperature}
                      onChange={(e) => setTemperature(parseFloat(e.target.value) || 1.0)}
                      min={0}
                      max={2}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paper: 1.0 for diversity
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="parallelism">Parallelism</Label>
                    <Input
                      id="parallelism"
                      type="number"
                      value={parallelism}
                      onChange={(e) => setParallelism(parseInt(e.target.value) || 3)}
                      min={1}
                      max={10}
                    />
                    <p className="text-xs text-muted-foreground">
                      Concurrent API calls (1-10)
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <Checkbox
                    id="requestLogprobs"
                    checked={requestLogprobs}
                    onCheckedChange={(checked) => setRequestLogprobs(checked === true)}
                  />
                  <div className="grid gap-0.5 leading-none">
                    <Label htmlFor="requestLogprobs" className="text-sm font-medium cursor-pointer">
                      Request token logprobs (Together AI)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Enable first-token entropy and confidence analysis
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                {/* Cost Estimate */}
                <div className="space-y-2 p-3 bg-muted rounded-lg">
                  <h4 className="font-medium text-sm flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Cost Estimate
                  </h4>
                  {costEstimate ? (
                    <>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground block">Total Runs</span>
                          <span className="font-medium">{selectedModels.length * runsPerModel}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Est. Cost</span>
                          <span className="font-medium">${costEstimate.estimatedCost.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Est. Time</span>
                          <span className="font-medium">{formatTime(costEstimate.estimatedTime)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ~{(costEstimate.estimatedTokens / 1000).toFixed(0)}K tokens estimated
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Select models and script to see estimate
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Start Button */}
          <div className="flex justify-end">
            <Button
              size="lg"
              onClick={handleStartBatch}
              disabled={selectedModels.length === 0 || !selectedScriptId || isLoading}
            >
              <Play className="w-4 h-4 mr-2" />
              Start Batch Experiment
            </Button>
          </div>
        </TabsContent>
        
        {/* Progress Tab */}
        <TabsContent value="progress">
          {currentBatch && (
            <BatchProgressPanel 
              batch={currentBatch}
              onPause={handlePauseBatch}
              onResume={handleResumeBatch}
              onCancel={handleCancelBatch}
            />
          )}
        </TabsContent>
        
        {/* Results Tab */}
        <TabsContent value="results">
          {currentBatch?.analysis ? (
            <BatchResultsPanel batch={currentBatch} />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No Results Yet</h3>
                <p className="text-muted-foreground">
                  Results will appear here once a batch experiment completes
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {/* History Tab */}
        <TabsContent value="history">
          {comparisonBatches ? (
            <ComparisonDashboard 
              batches={comparisonBatches}
              onClose={() => {
                setComparisonBatches(null);
                setCompareIds(new Set());
              }}
            />
          ) : (
            <div className="space-y-4">
              {compareIds.size >= 2 && (
                <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm">{compareIds.size} experiments selected for comparison</span>
                  <Button
                    size="sm"
                    disabled={isComparing}
                    onClick={async () => {
                      setIsComparing(true);
                      try {
                        const res = await fetch("/api/batch/compare", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ batchIds: Array.from(compareIds) }),
                        });
                        const data = await res.json();
                        if (data.batches) setComparisonBatches(data.batches);
                      } catch (e) {
                        console.error("Compare failed:", e);
                      } finally {
                        setIsComparing(false);
                      }
                    }}
                  >
                    {isComparing ? "Loading..." : "Compare Selected"}
                  </Button>
                </div>
              )}
              <BatchHistoryPanel 
                batches={batchHistory}
                compareIds={compareIds}
                onToggleCompare={(batchId) => {
                  setCompareIds(prev => {
                    const next = new Set(prev);
                    if (next.has(batchId)) next.delete(batchId);
                    else if (next.size < 4) next.add(batchId);
                    return next;
                  });
                }}
                onSelectBatch={(batchId) => {
                  fetch(`/api/batch/${batchId}/status`)
                    .then(res => res.json())
                    .then(batch => {
                      setCurrentBatch(batch);
                      setActiveTab(batch.analysis ? "results" : "progress");
                    });
                }}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Script Editor Modal */}
      <ScriptEditorModal
        script={selectedScriptFull}
        isOpen={isScriptEditorOpen}
        onClose={() => setIsScriptEditorOpen(false)}
        onSave={handleSaveScript}
      />
    </div>
  );
}

// ============ Sub-Components ============

function BatchStatusBadge({ status }: { status: BatchStatus }) {
  return (
    <Badge 
      variant="outline" 
      className={`${STATUS_COLORS[status]} bg-opacity-20 border-current`}
    >
      <span className={`w-2 h-2 rounded-full mr-2 ${STATUS_COLORS[status]}`} />
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function BatchProgressPanel({ 
  batch, 
  onPause, 
  onResume, 
  onCancel 
}: { 
  batch: BatchResult;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}) {
  const progress = batch.progress;
  const percentComplete = progress.totalRuns > 0 
    ? Math.round((progress.completedRuns / progress.totalRuns) * 100)
    : 0;
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Batch Progress</CardTitle>
              <CardDescription>
                {batch.config.script.name}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {batch.status === "running" && (
                <Button variant="outline" size="sm" onClick={onPause}>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause
                </Button>
              )}
              {batch.status === "paused" && (
                <Button variant="outline" size="sm" onClick={onResume}>
                  <Play className="w-4 h-4 mr-2" />
                  Resume
                </Button>
              )}
              {(batch.status === "running" || batch.status === "paused") && (
                <Button variant="destructive" size="sm" onClick={onCancel}>
                  <Square className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{progress.completedRuns} of {progress.totalRuns} runs</span>
              <span>{percentComplete}%</span>
            </div>
            <Progress value={percentComplete} className="h-3" />
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard 
              icon={<CheckCircle2 className="w-4 h-4 text-green-500" />}
              label="Completed"
              value={progress.completedRuns}
            />
            <StatCard 
              icon={<XCircle className="w-4 h-4 text-red-500" />}
              label="Failed"
              value={progress.failedRuns}
            />
            <ETACountdown 
              estimatedTimeRemaining={progress.estimatedTimeRemaining}
              isRunning={batch.status === "running"}
            />
            <StatCard 
              icon={<DollarSign className="w-4 h-4 text-muted-foreground" />}
              label="Cost"
              value={`$${progress.estimatedCost.toFixed(2)}`}
            />
          </div>
          
          {/* Current Status */}
          {progress.currentModel && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="text-sm">
                <span className="text-muted-foreground">Currently testing:</span>{" "}
                <span className="font-medium">{progress.currentModel}</span>
                {progress.currentRunIndex !== undefined && (
                  <span className="text-muted-foreground">
                    {" "}(run {progress.currentRunIndex + 1})
                  </span>
                )}
              </p>
              {/* Turn-level progress */}
              {progress.maxTurns !== undefined && progress.maxTurns > 0 && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Turn progress</span>
                    <span>{progress.currentTurn || 0} / {progress.maxTurns} turns</span>
                  </div>
                  <Progress 
                    value={((progress.currentTurn || 0) / progress.maxTurns) * 100} 
                    className="h-1.5" 
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Recent Runs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Runs</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {batch.runs.slice(-20).reverse().map(run => (
                <div 
                  key={run.runId}
                  className="flex items-center justify-between p-2 rounded hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    {run.status === "completed" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : run.status === "failed" ? (
                      <XCircle className="w-4 h-4 text-red-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">{run.modelId}</span>
                    <Badge variant="outline" className="text-xs">
                      Run {run.runIndex + 1}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {run.metrics.turnsCompleted} turns • {run.metrics.tokensUsed} tokens
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

function BatchResultsPanel({ batch }: { batch: BatchResult }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{batch.config.script.name}</h3>
          <p className="text-sm text-muted-foreground">
            {batch.progress.completedRuns} runs completed across {batch.config.execution.models.length} models
          </p>
        </div>
        <ExportPanel batchId={batch.batchId} batch={batch} />
      </div>
      <ResultsDashboard batch={batch} />
    </div>
  );
}

function BatchHistoryPanel({ 
  batches, 
  onSelectBatch,
  compareIds,
  onToggleCompare,
}: { 
  batches: BatchSummary[];
  onSelectBatch: (batchId: string) => void;
  compareIds?: Set<string>;
  onToggleCompare?: (batchId: string) => void;
}) {
  if (batches.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Previous Batches</h3>
          <p className="text-muted-foreground">
            Your batch experiment history will appear here
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Batch History</CardTitle>
        <CardDescription>
          {batches.length} previous experiment{batches.length !== 1 ? "s" : ""}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {batches.map(batch => (
              <div
                key={batch.batchId}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted cursor-pointer"
              >
                {onToggleCompare && (
                  <Checkbox
                    checked={compareIds?.has(batch.batchId) || false}
                    onCheckedChange={() => onToggleCompare(batch.batchId)}
                    className="mr-3"
                    disabled={!compareIds?.has(batch.batchId) && (compareIds?.size || 0) >= 4}
                  />
                )}
                <div className="flex-1 min-w-0" onClick={() => onSelectBatch(batch.batchId)}>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{batch.scriptName}</span>
                    <BatchStatusBadge status={batch.status} />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {batch.modelsCount} models • {batch.completedRuns}/{batch.totalRuns} runs
                  </p>
                </div>
                <div className="flex items-center gap-4" onClick={() => onSelectBatch(batch.batchId)}>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {formatBatchDate(batch.created)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatBatchTime(batch.created)}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

function StatCard({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string | number;
}) {
  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

function ETACountdown({ 
  estimatedTimeRemaining, 
  isRunning 
}: { 
  estimatedTimeRemaining?: number;
  isRunning: boolean;
}) {
  const [countdown, setCountdown] = useState(estimatedTimeRemaining || 0);
  
  useEffect(() => {
    setCountdown(estimatedTimeRemaining || 0);
  }, [estimatedTimeRemaining]);
  
  useEffect(() => {
    if (!isRunning || countdown <= 0) return;
    
    const timer = setInterval(() => {
      setCountdown(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(timer);
  }, [isRunning, countdown > 0]);
  
  const formatCountdown = (seconds: number): string => {
    if (seconds <= 0) return "--";
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="p-3 bg-muted rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">ETA</span>
      </div>
      <p className="text-lg font-semibold font-mono">
        {formatCountdown(countdown)}
      </p>
      {isRunning && countdown > 0 && (
        <p className="text-xs text-muted-foreground">
          ~{formatTime(estimatedTimeRemaining || 0)} remaining
        </p>
      )}
    </div>
  );
}

// ============ Utilities ============

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatBatchDate(date: Date | string | { value: string } | undefined): string {
  if (!date) return "";
  const d = typeof date === "object" && "value" in date 
    ? new Date(date.value) 
    : new Date(date);
  return d.toLocaleDateString(undefined, { 
    month: "short", 
    day: "numeric", 
    year: "numeric" 
  });
}

function formatBatchTime(date: Date | string | { value: string } | undefined): string {
  if (!date) return "";
  const d = typeof date === "object" && "value" in date 
    ? new Date(date.value) 
    : new Date(date);
  return d.toLocaleTimeString(undefined, { 
    hour: "2-digit", 
    minute: "2-digit" 
  });
}
