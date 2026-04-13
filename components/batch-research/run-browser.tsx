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
  User,
  Bot,
  Brain,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  Zap,
  Clock,
} from "lucide-react";
import type { BatchResult, BatchRunResult, BatchMessage } from "@/lib/starchamber/batch/types";

interface RunBrowserProps {
  batch: BatchResult;
}

export function RunBrowser({ batch }: RunBrowserProps) {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedRunIndex, setSelectedRunIndex] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  
  const models = useMemo(() => {
    const modelSet = new Set(batch.runs.map(r => r.modelId));
    return Array.from(modelSet);
  }, [batch.runs]);
  
  const runsForModel = useMemo(() => {
    if (!selectedModel) return [];
    return batch.runs.filter(r => r.modelId === selectedModel);
  }, [batch.runs, selectedModel]);
  
  const currentRun = runsForModel[selectedRunIndex];
  
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId);
    setSelectedRunIndex(0);
  };
  
  const handlePrevRun = () => {
    setSelectedRunIndex(Math.max(0, selectedRunIndex - 1));
  };
  
  const handleNextRun = () => {
    setSelectedRunIndex(Math.min(runsForModel.length - 1, selectedRunIndex + 1));
  };
  
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Browse Individual Runs
          </CardTitle>
          <CardDescription>
            Explore full conversations from specific experiment runs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Model</label>
              <Select value={selectedModel} onValueChange={handleModelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a model..." />
                </SelectTrigger>
                <SelectContent>
                  {models.map(modelId => (
                    <SelectItem key={modelId} value={modelId}>
                      {modelId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {selectedModel && runsForModel.length > 0 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Run</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevRun}
                    disabled={selectedRunIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="flex-1 text-center text-sm">
                    Run {selectedRunIndex + 1} of {runsForModel.length}
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextRun}
                    disabled={selectedRunIndex === runsForModel.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {currentRun && (
            <div className="space-y-4">
              <Separator />
              
              {/* Run Summary */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <StatusIcon status={currentRun.status} />
                  <span className="font-medium">{currentRun.modelId}</span>
                  <Badge variant="outline" className="text-xs">
                    Run #{currentRun.runIndex + 1}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MessageSquare className="w-4 h-4" />
                    {currentRun.metrics.turnsCompleted} turns
                  </span>
                  <span className="flex items-center gap-1">
                    <Zap className="w-4 h-4" />
                    {currentRun.metrics.tokensUsed} tokens
                  </span>
                </div>
              </div>
              
              {/* Quick Metrics */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 bg-muted rounded text-center">
                  <p className="text-xs text-muted-foreground">Compliance</p>
                  <p className="font-medium">
                    {currentRun.compliance 
                      ? `${(currentRun.compliance.overallComplianceRate * 100).toFixed(0)}%`
                      : 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <p className="text-xs text-muted-foreground">Goal Deviation</p>
                  <p className="font-medium">{currentRun.metrics.goalDeviation.toFixed(2)}</p>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <p className="text-xs text-muted-foreground">Cooperation</p>
                  <p className="font-medium">{(currentRun.metrics.cooperation * 100).toFixed(0)}%</p>
                </div>
                <div className="p-2 bg-muted rounded text-center">
                  <p className="text-xs text-muted-foreground">Confidence</p>
                  <p className="font-medium">
                    {currentRun.metrics.avgConfidence 
                      ? `${(currentRun.metrics.avgConfidence * 100).toFixed(0)}%`
                      : 'N/A'}
                  </p>
                </div>
              </div>
              
              {/* View Full Conversation Button */}
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setIsOpen(true)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                View Full Conversation
              </Button>
            </div>
          )}
          
          {!selectedModel && (
            <div className="py-8 text-center text-muted-foreground">
              <Brain className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Select a model to browse individual runs</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Full Conversation Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Run Conversation
            </DialogTitle>
            <DialogDescription>
              {currentRun?.modelId} - Run #{(currentRun?.runIndex ?? 0) + 1}
            </DialogDescription>
          </DialogHeader>
          
          {currentRun && (
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-[60vh]">
                <div className="space-y-4 pr-4">
                  {currentRun.conversation.map((message, index) => (
                    <MessageBubble 
                      key={index} 
                      message={message} 
                      index={index}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function StatusIcon({ status }: { status: BatchRunResult["status"] }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case "failed":
      return <XCircle className="w-4 h-4 text-red-500" />;
    case "stopped":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
  }
}

function MessageBubble({ message, index }: { message: BatchMessage; index: number }) {
  const isResearcher = message.role === "researcher";
  
  return (
    <div className={`flex gap-3 ${isResearcher ? "" : "flex-row-reverse"}`}>
      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
        isResearcher 
          ? "bg-blue-100 text-blue-600 dark:bg-blue-950 dark:text-blue-400" 
          : "bg-purple-100 text-purple-600 dark:bg-purple-950 dark:text-purple-400"
      }`}>
        {isResearcher ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      
      <div className={`flex-1 ${isResearcher ? "pr-12" : "pl-12"}`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium">
            {isResearcher ? "Researcher" : "Model"}
          </span>
          <span className="text-xs text-muted-foreground">
            Turn {Math.floor(index / 2) + 1}
          </span>
          {message.logprobs && (
            <Badge variant="outline" className="text-xs">
              <Zap className="w-3 h-3 mr-1" />
              Logprobs
            </Badge>
          )}
        </div>
        
        <div className={`p-3 rounded-lg text-sm ${
          isResearcher 
            ? "bg-blue-50 dark:bg-blue-950/50" 
            : "bg-muted"
        }`}>
          <p className="whitespace-pre-wrap">{message.content}</p>
          
          {/* Show thinking if available */}
          {message.thinking && (
            <div className="mt-2 pt-2 border-t border-dashed">
              <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                <Brain className="w-3 h-3" />
                Model's thinking
              </p>
              <p className="text-xs text-muted-foreground italic whitespace-pre-wrap">
                {message.thinking.length > 500 
                  ? message.thinking.slice(0, 500) + "..." 
                  : message.thinking}
              </p>
            </div>
          )}
        </div>
        
        {/* Logprobs details */}
        {message.logprobs && (
          <div className="mt-1 text-xs text-muted-foreground flex gap-3">
            {message.logprobs.firstTokenEntropy !== undefined && (
              <span>First Token Entropy: {message.logprobs.firstTokenEntropy.toFixed(3)}</span>
            )}
            {message.logprobs.avgConfidence !== undefined && (
              <span>Avg Confidence: {(message.logprobs.avgConfidence * 100).toFixed(1)}%</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
