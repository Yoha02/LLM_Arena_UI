"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StarChamberMessageBubble } from "@/components/shared/message-bubble";
import {
  Maximize2,
  Minimize2,
  MessageSquare,
  Send,
  Loader2,
  Wifi,
  WifiOff,
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
}: StarChamberConversationProps) {
  const [messageInput, setMessageInput] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  return (
    <Card className={cn(
      "flex flex-col",
      isFullscreen && "fixed inset-4 z-50 m-0"
    )}>
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="w-5 h-5" />
              Conversation
            </CardTitle>
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
            
            {/* Fullscreen toggle */}
            {onToggleFullscreen && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleFullscreen}
                title={isFullscreen ? "Exit fullscreen" : "Expand to fullscreen"}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
            )}
          </div>
        </div>
        
        {/* Experiment Status */}
        {experimentStatus && (
          <p className="text-sm text-muted-foreground">{experimentStatus}</p>
        )}
        
        {/* WebSocket Error */}
        {webSocketError && (
          <p className="text-sm text-red-600">{webSocketError}</p>
        )}
      </CardHeader>

      <CardContent className={cn(
        "flex-1 flex flex-col p-0",
        isFullscreen ? "min-h-0" : "min-h-[400px]"
      )}>
        {/* Messages */}
        <ScrollArea 
          ref={scrollAreaRef}
          className={cn(
            "flex-1 p-4",
            isFullscreen ? "h-[calc(100vh-280px)]" : "h-[400px]"
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

        {/* Message Input */}
        {isExperimentRunning && (
          <div className="border-t p-4">
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
                className="min-h-[60px] resize-none"
                disabled={isModelResponding}
              />
              <Button
                onClick={handleSend}
                disabled={!messageInput.trim() || isModelResponding}
                className="self-end"
              >
                {isModelResponding ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
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

