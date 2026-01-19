"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StarChamberMessageBubble } from "@/components/shared/message-bubble";
import {
  Maximize2,
  X,
  MessageSquare,
  Send,
  Loader2,
  Wifi,
  WifiOff,
  Play,
  Square,
  FlaskConical,
  FileDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StarChamberMessage, SentimentData } from "@/lib/core/types";

// ============ Types ============

interface StarChamberConversationProps {
  conversation: StarChamberMessage[];
  isExperimentRunning: boolean;
  isModelResponding: boolean;
  waitingForResearcher: boolean;
  experimentStatus: string;
  isWebSocketConnected: boolean;
  webSocketError: string | null;
  
  // Streaming
  streamingContent?: string;
  streamingThinking?: string;
  
  // Current sentiment for the streaming message
  latestSentiment?: SentimentData;
  
  // Message input
  onSendMessage: (message: string) => void;
  
  // Fullscreen
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  
  // Experiment control (moved to center)
  firstMessage?: string;
  onFirstMessageChange?: (message: string) => void;
  canStartExperiment?: boolean;
  onStartExperiment?: () => void;
  onStopExperiment?: () => void;
  hasCompletedExperiment?: boolean;
  onDownloadReport?: (format: 'html' | 'pdf') => void;
  initialFirstMessage?: string; // The first message that was sent (to display after start)
}

// ============ Component ============

export function StarChamberConversation({
  conversation,
  isExperimentRunning,
  isModelResponding,
  waitingForResearcher,
  experimentStatus,
  isWebSocketConnected,
  webSocketError,
  streamingContent,
  streamingThinking,
  latestSentiment,
  onSendMessage,
  isFullscreen = false,
  onToggleFullscreen,
  // Experiment control props
  firstMessage = "",
  onFirstMessageChange,
  canStartExperiment = false,
  onStartExperiment,
  onStopExperiment,
  hasCompletedExperiment = false,
  onDownloadReport,
  initialFirstMessage,
}: StarChamberConversationProps) {
  const [messageInput, setMessageInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const firstMessageInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [conversation, streamingContent]);

  // Focus input when waiting for researcher
  useEffect(() => {
    if (waitingForResearcher && inputRef.current) {
      inputRef.current.focus();
    }
  }, [waitingForResearcher]);

  const handleSend = () => {
    if (messageInput.trim() && !isModelResponding) {
      onSendMessage(messageInput.trim());
      setMessageInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Main card content - height designed to align with left sidebar (Model Selection + System Context + Researcher Settings + Experiment Active cards)
  // Uses fixed height to cap and enable internal scrolling
  const cardContent = (
    <Card className={cn(
      "flex flex-col",
      !isFullscreen && "h-[1020px] max-h-[1020px]",
      isFullscreen && "w-full h-full max-h-full border-0 rounded-none bg-background"
    )}>
      {/* Experiment Control Bar - Top of Center Column */}
      <div className={cn(
        "border-b p-4 flex-shrink-0",
        isExperimentRunning ? "bg-green-50/50 border-green-200" : "bg-muted/30"
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            <span className="font-semibold">
              {isExperimentRunning ? "Experiment Running" : "Start Experiment"}
            </span>
            {isWebSocketConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600 text-xs">
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600 text-xs">
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Status Badge */}
            {isExperimentRunning && (
              <Badge variant={isModelResponding ? "default" : "secondary"}>
                {isModelResponding ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Model responding...
                  </>
                ) : waitingForResearcher ? (
                  "Your turn"
                ) : (
                  "Running"
                )}
              </Badge>
            )}
            
            {/* Fullscreen toggle - only show when not fullscreen */}
            {!isFullscreen && onToggleFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleFullscreen}
                title="Expand to fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* First Message Input (before experiment starts) */}
        {!isExperimentRunning && onFirstMessageChange && onStartExperiment && (
          <div className="space-y-3">
            <Textarea
              ref={firstMessageInputRef}
              placeholder="Enter your first message to begin the interrogation..."
              value={firstMessage}
              onChange={(e) => onFirstMessageChange(e.target.value)}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                if (target.value !== firstMessage) {
                  onFirstMessageChange(target.value);
                }
              }}
              className="min-h-[60px] resize-none bg-background"
            />
            <div className="flex gap-2">
              <Button 
                onClick={onStartExperiment} 
                disabled={!canStartExperiment}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Interrogation
              </Button>
              {hasCompletedExperiment && onDownloadReport && (
                <>
                  <Button variant="outline" onClick={() => onDownloadReport('html')} size="sm">
                    <FileDown className="w-4 h-4 mr-1" />
                    HTML
                  </Button>
                  <Button variant="outline" onClick={() => onDownloadReport('pdf')} size="sm">
                    <FileDown className="w-4 h-4 mr-1" />
                    PDF
                  </Button>
                </>
              
              )}
            </div>
          </div>
        )}
        
        {/* Show first message and controls (after experiment starts) */}
        {isExperimentRunning && onStopExperiment && (
          <div className="space-y-3">
            {initialFirstMessage && (
              <div className="text-sm p-3 bg-background rounded-lg border">
                <span className="text-muted-foreground text-xs block mb-1">First message sent:</span>
                <span className="text-foreground">{initialFirstMessage}</span>
              </div>
            )}
            <Button 
              onClick={onStopExperiment} 
              variant="destructive"
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              End Experiment
            </Button>
          </div>
        )}
        
        {/* Experiment Status */}
        {experimentStatus && (
          <p className="text-sm text-muted-foreground mt-2">{experimentStatus}</p>
        )}
        
        {/* WebSocket Error */}
        {webSocketError && (
          <p className="text-sm text-red-600 mt-1">{webSocketError}</p>
        )}
      </div>
      
      {/* Conversation Header */}
      <CardHeader className="pb-2 pt-3 border-b flex-shrink-0">
        <CardTitle className="text-lg flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Conversation
        </CardTitle>
      </CardHeader>

      <CardContent className={cn(
        "flex-1 flex flex-col p-0 min-h-0 overflow-hidden",
        isFullscreen && "min-h-0"
      )}>
        {/* Messages - Scrollable Area */}
        <ScrollArea 
          ref={scrollAreaRef}
          className={cn(
            "flex-1 p-4 min-h-0",
            isFullscreen ? "max-h-[calc(100vh-280px)]" : "flex-1 min-h-0"
          )}
        >
          {conversation.length === 0 && !streamingContent ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <div className="text-center">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No messages yet</p>
                <p className="text-sm">
                  {isExperimentRunning 
                    ? "Type your first message below" 
                    : "Start an experiment to begin"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {conversation.map((message) => (
                <StarChamberMessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
              
              {/* Streaming message preview */}
              {isModelResponding && streamingContent && (
                <StreamingMessagePreview
                  content={streamingContent}
                  thinking={streamingThinking}
                />
              )}
            </div>
          )}
        </ScrollArea>

        {/* Message Input - Fixed at bottom */}
        {isExperimentRunning && (
          <div className="border-t p-4 flex-shrink-0 bg-background">
            <div className="flex gap-2">
              <Textarea
                ref={inputRef}
                placeholder={
                  isModelResponding 
                    ? "Waiting for model response..." 
                    : "Type your message... (Enter to send, Shift+Enter for new line)"
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn(
                  "min-h-[60px] max-h-[120px] resize-none",
                  "bg-background border-2 focus:border-primary",
                  "placeholder:text-muted-foreground/70"
                )}
                disabled={isModelResponding}
              />
              <Button
                onClick={handleSend}
                disabled={!messageInput.trim() || isModelResponding}
                className="self-end"
                size="lg"
              >
                {isModelResponding ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );

  // State to track if we're in browser (for Portal)
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // If fullscreen, render via Portal to escape all stacking contexts
  if (isFullscreen && isMounted) {
    const fullscreenContent = (
      <div className="fixed inset-0 z-[9999] bg-white dark:bg-zinc-950 overflow-hidden flex flex-col">
        {/* Fullscreen Header with Close Button */}
        <div className="flex items-center justify-between p-4 border-b bg-white dark:bg-zinc-950 flex-shrink-0">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-5 h-5" />
            <span className="font-semibold text-lg">StarChamber - Fullscreen Mode</span>
            {isWebSocketConnected ? (
              <Badge variant="outline" className="text-green-600 border-green-600">
                <Wifi className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-600">
                <WifiOff className="w-3 h-3 mr-1" />
                Disconnected
              </Badge>
            )}
            {isExperimentRunning && (
              <Badge variant={isModelResponding ? "default" : "secondary"}>
                {isModelResponding ? "Model responding..." : waitingForResearcher ? "Your turn" : "Running"}
              </Badge>
            )}
          </div>
          {onToggleFullscreen && (
            <Button
              variant="outline"
              onClick={onToggleFullscreen}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Exit Fullscreen
            </Button>
          )}
        </div>
        
        {/* Fullscreen Content - Scrollable */}
        <div className="flex-1 overflow-auto p-4 bg-white dark:bg-zinc-950">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* First message display (when running) */}
            {isExperimentRunning && initialFirstMessage && (
              <div className="p-4 rounded-lg border bg-muted/30">
                <span className="text-sm text-muted-foreground block mb-1">First message sent:</span>
                <span className="text-foreground">{initialFirstMessage}</span>
              </div>
            )}
            
            {/* End Experiment Button */}
            {isExperimentRunning && onStopExperiment && (
              <Button 
                onClick={onStopExperiment} 
                variant="destructive"
                className="w-full"
              >
                <Square className="w-4 h-4 mr-2" />
                End Experiment
              </Button>
            )}
            
            {/* Conversation Messages */}
            <div className="space-y-4">
              {conversation.map((message) => (
                <StarChamberMessageBubble
                  key={message.id}
                  message={message}
                />
              ))}
              
              {/* Streaming message preview */}
              {isModelResponding && streamingContent && (
                <StreamingMessagePreview
                  content={streamingContent}
                  thinking={streamingThinking}
                />
              )}
              
              {conversation.length === 0 && !streamingContent && (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <div className="text-center">
                    <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No messages yet</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Fullscreen Input - Fixed at bottom */}
        {isExperimentRunning && (
          <div className="border-t p-4 bg-white dark:bg-zinc-950 flex-shrink-0">
            <div className="max-w-4xl mx-auto flex gap-2">
              <Textarea
                placeholder={
                  isModelResponding 
                    ? "Waiting for model response..." 
                    : "Type your message... (Enter to send, Shift+Enter for new line)"
                }
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[120px] resize-none bg-white dark:bg-zinc-900 border-2"
                disabled={isModelResponding}
              />
              <Button
                onClick={handleSend}
                disabled={!messageInput.trim() || isModelResponding}
                className="self-end"
                size="lg"
              >
                {isModelResponding ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    );
    
    // Use Portal to render at document body level, escaping all stacking contexts
    return createPortal(fullscreenContent, document.body);
  }

  return cardContent;
}

// ============ Streaming Preview ============

function StreamingMessagePreview({ 
  content, 
  thinking 
}: { 
  content: string; 
  thinking?: string;
}) {
  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-muted/50 border-muted animate-pulse">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center">
        <Loader2 className="w-4 h-4 animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm">Model</span>
          <Badge variant="outline" className="text-xs">
            Generating...
          </Badge>
        </div>
        
        {thinking && (
          <div className="mb-2 p-2 bg-muted rounded text-xs font-mono text-muted-foreground">
            <span className="font-medium">Thinking: </span>
            {thinking.slice(-200)}
            {thinking.length > 200 && "..."}
          </div>
        )}
        
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap m-0">
            {content}
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />
          </p>
        </div>
      </div>
    </div>
  );
}

