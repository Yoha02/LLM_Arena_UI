"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThinkingTraceProps {
  thinking: string;
  isExpanded?: boolean;
  onToggle?: () => void;
  className?: string;
  variant?: 'default' | 'compact';
}

export function ThinkingTrace({ 
  thinking, 
  isExpanded: controlledExpanded,
  onToggle,
  className,
  variant = 'default'
}: ThinkingTraceProps) {
  const [internalExpanded, setInternalExpanded] = useState(false);
  
  // Support both controlled and uncontrolled modes
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;
  const handleToggle = onToggle || (() => setInternalExpanded(!internalExpanded));

  if (!thinking) return null;

  return (
    <Collapsible 
      open={isExpanded} 
      onOpenChange={handleToggle}
      className={cn("mb-2", className)}
    >
      <CollapsibleTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className={cn(
            "p-0 h-auto font-normal text-muted-foreground hover:text-foreground",
            variant === 'compact' && "text-xs"
          )}
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 mr-1" />
          ) : (
            <ChevronRight className="w-4 h-4 mr-1" />
          )}
          <Brain className="w-4 h-4 mr-1" />
          <span>{isExpanded ? 'Hide' : 'Show'} Thinking</span>
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        <div className={cn(
          "bg-muted/50 rounded-md p-3 text-sm text-muted-foreground font-mono whitespace-pre-wrap border",
          variant === 'compact' && "p-2 text-xs"
        )}>
          {thinking}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

