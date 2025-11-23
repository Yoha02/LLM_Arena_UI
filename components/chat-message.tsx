"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ChevronDown, ChevronRight, Brain, Filter } from "lucide-react"
import type { ChatMessage as ChatMessageType } from "@/app/page"

interface ChatMessageProps {
  message: ChatMessageType
}

export function ChatMessage({ message }: ChatMessageProps) {
  const [isThinkingOpen, setIsThinkingOpen] = useState(false)
  const [isFilteredOpen, setIsFilteredOpen] = useState(false)

  const modelColor = message.model === "A" ? "bg-blue-50 border-blue-200" : "bg-purple-50 border-purple-200"
  const modelBadgeColor = message.model === "A" ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"

  return (
    <Card className={`${modelColor} transition-colors`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${modelBadgeColor}`}>
              Model {message.model}: {message.modelName}
            </span>
            <span className="text-sm text-gray-500">Turn {message.turn}</span>
          </div>
          <span className="text-xs text-gray-400">{message.timestamp.toLocaleTimeString()}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {message.thinking && (
          <Collapsible open={isThinkingOpen} onOpenChange={setIsThinkingOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-normal text-gray-600 hover:text-gray-800">
                {isThinkingOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                <Brain className="w-4 h-4 mr-1" />
                Show Thinking
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-gray-100 rounded-md p-3 text-sm text-gray-700 font-mono whitespace-pre-wrap">
                {message.thinking}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        <div className="prose prose-sm max-w-none">
          <div className="whitespace-pre-wrap text-gray-800">
            {message.originalContent || message.content}
          </div>
        </div>

        {message.filterMetadata?.wasFiltered && (
          <Collapsible open={isFilteredOpen} onOpenChange={setIsFilteredOpen} className="mt-3">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-0 h-auto font-normal text-gray-600 hover:text-gray-800">
                {isFilteredOpen ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
                <Filter className="w-4 h-4 mr-1" />
                <span className="text-xs">
                  Final Message (sent to other model) - {message.filterMetadata.removedSections.length} section(s) filtered
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-3">
                <div className="text-xs font-semibold text-amber-800 mb-2 flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  What the other model actually sees:
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap font-mono bg-white rounded p-2 border border-amber-100">
                  {message.content}
                </div>
                <div className="text-xs text-amber-700 mt-2">
                  Confidence: {(message.filterMetadata.filterConfidence * 100).toFixed(0)}% • 
                  Removed: {message.filterMetadata.removedSections.join(', ')}
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  )
}
