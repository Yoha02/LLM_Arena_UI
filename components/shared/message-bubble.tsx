"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ThinkingTrace } from "./thinking-trace";
import { 
  Bot, 
  User, 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  BarChart3,
  Info
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { 
  ArenaChatMessage, 
  StarChamberMessage, 
  LogprobsData 
} from "@/lib/core/types";

// ============ Arena Message Bubble ============

interface ArenaMessageBubbleProps {
  message: ArenaChatMessage;
  variant?: 'default' | 'compact';
}

export function ArenaMessageBubble({ message, variant = 'default' }: ArenaMessageBubbleProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [isFilteredOpen, setIsFilteredOpen] = useState(false);

  const isModelA = message.model === "A";
  const modelColor = isModelA 
    ? "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800" 
    : "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800";
  const modelBadgeColor = isModelA 
    ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" 
    : "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";

  return (
    <Card className={cn(modelColor, "transition-colors", variant === 'compact' && "shadow-sm")}>
      <CardHeader className={cn("pb-2", variant === 'compact' && "p-3 pb-1")}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              modelBadgeColor
            )}>
              Model {message.model}: {message.modelName}
            </span>
            <Badge variant="outline" className="text-xs">
              Turn {message.turnNumber}
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>
      </CardHeader>
      <CardContent className={cn("space-y-3", variant === 'compact' && "p-3 pt-0")}>
        {message.thinking && (
          <ThinkingTrace 
            thinking={message.thinking}
            isExpanded={isThinkingOpen}
            onToggle={() => setIsThinkingOpen(!isThinkingOpen)}
            variant={variant}
          />
        )}

        <div className="prose prose-sm max-w-none dark:prose-invert">
          <div className="whitespace-pre-wrap">
            {message.originalContent || message.content}
          </div>
        </div>

        {message.filterMetadata?.wasFiltered && (
          <Collapsible open={isFilteredOpen} onOpenChange={setIsFilteredOpen} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground">
                {isFilteredOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                <Filter className="w-4 h-4 mr-1" />
                <span className="text-xs">
                  Filtered Message - {message.filterMetadata.removedSections.length} section(s) removed
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3 dark:bg-amber-950/20 dark:border-amber-800">
                <div className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  What the other model actually sees:
                </div>
                <div className="text-sm whitespace-pre-wrap font-mono bg-white dark:bg-black/20 rounded p-2 border border-amber-100 dark:border-amber-900">
                  {message.content}
                </div>
                <div className="text-xs text-amber-700 dark:text-amber-300 mt-2">
                  Confidence: {(message.filterMetadata.filterConfidence * 100).toFixed(0)}% • 
                  Removed: {message.filterMetadata.removedSections.join(', ')}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// ============ StarChamber Message Bubble ============

interface StarChamberMessageBubbleProps {
  message: StarChamberMessage;
  variant?: 'default' | 'compact';
  onShowLogprobs?: () => void;
}

export function StarChamberMessageBubble({ 
  message, 
  variant = 'default',
  onShowLogprobs 
}: StarChamberMessageBubbleProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false);
  const [showLogprobsDetail, setShowLogprobsDetail] = useState(false);

  const isResearcher = message.role === 'researcher';
  
  const bgColor = isResearcher 
    ? "bg-primary/5 border-primary/20" 
    : "bg-muted/50 border-muted";
  
  const avatarBg = isResearcher
    ? "bg-primary text-primary-foreground"
    : "bg-green-500 text-white";

  return (
    <div className={cn(
      "flex gap-3 p-4 rounded-lg border",
      bgColor,
      variant === 'compact' && "p-2 gap-2"
    )}>
      {/* Avatar */}
      <div className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        avatarBg
      )}>
        {isResearcher ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">{message.senderName}</span>
          <Badge variant="outline" className="text-xs">
            Turn {message.turnNumber}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {message.timestamp.toLocaleTimeString()}
          </span>
        </div>

        {/* Thinking Trace (model only) */}
        {!isResearcher && message.thinking && (
          <ThinkingTrace 
            thinking={message.thinking}
            isExpanded={isThinkingOpen}
            onToggle={() => setIsThinkingOpen(!isThinkingOpen)}
            variant={variant}
          />
        )}

        {/* Message Content */}
        <div className="prose prose-sm max-w-none dark:prose-invert">
          <p className="whitespace-pre-wrap m-0">{message.content}</p>
        </div>

        {/* Logprobs Indicator (model messages only) */}
        {!isResearcher && message.logprobs !== undefined && (
          <div className="mt-2">
            {message.logprobs.available ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <BarChart3 className="w-3 h-3" />
                <span>
                  Avg confidence: {(message.logprobs.averageConfidence * 100).toFixed(1)}%
                </span>
                {message.logprobs.lowConfidenceTokens.length > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {message.logprobs.lowConfidenceTokens.length} uncertain tokens
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-2 text-xs"
                  onClick={() => {
                    setShowLogprobsDetail(!showLogprobsDetail);
                    onShowLogprobs?.();
                  }}
                >
                  {showLogprobsDetail ? 'Hide' : 'Show'} details
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/50">
                <Info className="w-3 h-3" />
                <span>Logprobs unavailable for this model</span>
              </div>
            )}
            
            {/* Logprobs Detail View */}
            {showLogprobsDetail && message.logprobs.available && (
              <LogprobsVisualization logprobs={message.logprobs} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============ Logprobs Visualization ============

interface LogprobsVisualizationProps {
  logprobs: LogprobsData;
}

function LogprobsVisualization({ logprobs }: LogprobsVisualizationProps) {
  if (!logprobs.available || logprobs.tokens.length === 0) {
    return null;
  }

  return (
    <div className="mt-2 p-3 bg-muted/30 rounded-lg text-xs font-mono overflow-x-auto border">
      <div className="flex flex-wrap gap-0.5">
        {logprobs.tokens.map((token, i) => {
          const confidence = token.probability;
          const bgColor = confidence > 0.9 
            ? "bg-green-500/20 hover:bg-green-500/30" 
            : confidence > 0.7 
              ? "bg-yellow-500/20 hover:bg-yellow-500/30"
              : confidence > 0.5 
                ? "bg-orange-500/20 hover:bg-orange-500/30"
                : "bg-red-500/20 hover:bg-red-500/30";

          return (
            <span
              key={i}
              className={cn(
                "px-1 py-0.5 rounded cursor-help transition-colors",
                bgColor
              )}
              title={`"${token.token}" - ${(confidence * 100).toFixed(1)}% confidence`}
            >
              {token.token}
            </span>
          );
        })}
      </div>
      <div className="mt-2 pt-2 border-t border-muted text-muted-foreground">
        <span className="inline-flex items-center gap-1 mr-3">
          <span className="w-3 h-3 rounded bg-green-500/20"></span> &gt;90%
        </span>
        <span className="inline-flex items-center gap-1 mr-3">
          <span className="w-3 h-3 rounded bg-yellow-500/20"></span> 70-90%
        </span>
        <span className="inline-flex items-center gap-1 mr-3">
          <span className="w-3 h-3 rounded bg-orange-500/20"></span> 50-70%
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500/20"></span> &lt;50%
        </span>
      </div>
    </div>
  );
}

// ============ Exports ============

export { LogprobsVisualization };

