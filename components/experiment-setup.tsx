"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Play, Square, ChevronDown, ChevronRight, Settings } from "lucide-react"
import { DownloadButton } from "@/components/ui/download-button"
import { useState, useEffect } from "react"

interface ExperimentSetupProps {
  experimentMode: "automatic" | "manual" // NEW
  onExperimentModeChange: (mode: "automatic" | "manual") => void // NEW
  systemPrompt: string // NEW
  onSystemPromptChange: (prompt: string) => void // NEW
  promptingMode: "shared" | "individual"
  onPromptingModeChange: (mode: "shared" | "individual") => void
  sharedPrompt: string
  onSharedPromptChange: (prompt: string) => void
  promptA: string
  onPromptAChange: (prompt: string) => void
  promptB: string
  onPromptBChange: (prompt: string) => void
  maxTurns: number
  onMaxTurnsChange: (turns: number) => void
  canStartExperiment: boolean
  isExperimentRunning: boolean
  onStartExperiment: () => void
  onStopExperiment: () => void
  onDownloadReportHTML: () => Promise<void>
  onDownloadReportPDF: () => Promise<void>
  hasCompletedExperiment: boolean
  isDemoMode?: boolean
}

export function ExperimentSetup({
  experimentMode,
  onExperimentModeChange,
  systemPrompt,
  onSystemPromptChange,
  promptingMode,
  onPromptingModeChange,
  sharedPrompt,
  onSharedPromptChange,
  promptA,
  onPromptAChange,
  promptB,
  onPromptBChange,
  maxTurns,
  onMaxTurnsChange,
  canStartExperiment,
  isExperimentRunning,
  onStartExperiment,
  onStopExperiment,
  onDownloadReportHTML,
  onDownloadReportPDF,
  hasCompletedExperiment,
  isDemoMode = false,
}: ExperimentSetupProps) {
  // Local state for max turns input to allow clearing and custom entry
  const [maxTurnsInput, setMaxTurnsInput] = useState<string>(maxTurns === -1 ? '5' : maxTurns.toString())
  const [isUnlimited, setIsUnlimited] = useState<boolean>(maxTurns === -1)
  
  // Local state for system prompt advanced settings
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false)

  // Sync local state with prop changes (for demo scenarios, etc.)
  useEffect(() => {
    if (maxTurns === -1) {
      setIsUnlimited(true)
      setMaxTurnsInput('5') // Default value when unlimited is unchecked
    } else {
      setIsUnlimited(false)
      setMaxTurnsInput(maxTurns.toString())
    }
  }, [maxTurns])
  return (
    <Card>
      <CardHeader>
        <CardTitle>Experiment Setup</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isDemoMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-blue-800">Demo Mode Active</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              Showing sample data from a Resource Allocation experiment where two LLMs negotiate for computer
              components.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-6">
          <div>
            <Label className="text-base font-medium">Experiment Mode</Label>
            <RadioGroup
              value={experimentMode}
              onValueChange={(value) => onExperimentModeChange(value as "automatic" | "manual")}
              className="flex flex-col space-y-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="automatic" id="automatic" />
                <Label htmlFor="automatic" className="text-sm">
                  Automatic
                  <span className="text-xs text-gray-500 block">Models respond automatically</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="manual" id="manual" />
                <Label htmlFor="manual" className="text-sm">
                  Manual Control
                  <span className="text-xs text-gray-500 block">User controls each turn</span>
                </Label>
              </div>
            </RadioGroup>
          </div>
          
          <div>
            <Label className="text-base font-medium">Prompting Mode</Label>
            <RadioGroup
              value={promptingMode}
              onValueChange={(value) => onPromptingModeChange(value as "shared" | "individual")}
              className="flex flex-col space-y-2 mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="shared" id="shared" />
                <Label htmlFor="shared" className="text-sm">Shared Prompt</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="individual" id="individual" />
                <Label htmlFor="individual" className="text-sm">Individual Prompts</Label>
              </div>
            </RadioGroup>
          </div>
        </div>

        {experimentMode === "manual" && (
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-0 h-auto">
                {isAdvancedOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Advanced: Custom System Prompt</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3">
              <div className="border rounded-lg p-4 bg-gray-50">
                <Label htmlFor="system-prompt" className="text-sm font-medium">
                  System Prompt Template
                </Label>
                <p className="text-xs text-gray-600 mt-1 mb-2">
                  Customize how models are instructed. Use {"{MODEL}"} as placeholder for Model A/B.
                </p>
                <Textarea
                  id="system-prompt"
                  placeholder="You are Model {MODEL}. Begin the conversation based on your scenario instructions. Respond naturally and authentically."
                  value={systemPrompt}
                  onChange={(e) => onSystemPromptChange(e.target.value)}
                  className="min-h-[80px] text-sm"
                  disabled={isExperimentRunning}
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 This replaces the default system prompts and enables authentic scenario framing
                </p>
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}

        {promptingMode === "shared" ? (
          <div>
            <Label htmlFor="shared-prompt">Shared Prompt</Label>
            <Textarea
              id="shared-prompt"
              placeholder="Enter the shared prompt for both models..."
              value={sharedPrompt}
              onChange={(e) => onSharedPromptChange(e.target.value)}
              className="min-h-[100px] mt-1"
              disabled={isExperimentRunning}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="prompt-a">Prompt for Model A</Label>
              <Textarea
                id="prompt-a"
                placeholder="Enter prompt for Model A..."
                value={promptA}
                onChange={(e) => onPromptAChange(e.target.value)}
                className="min-h-[100px] mt-1"
                disabled={isExperimentRunning}
              />
            </div>
            <div>
              <Label htmlFor="prompt-b">Prompt for Model B</Label>
              <Textarea
                id="prompt-b"
                placeholder="Enter prompt for Model B..."
                value={promptB}
                onChange={(e) => onPromptBChange(e.target.value)}
                className="min-h-[100px] mt-1"
                disabled={isExperimentRunning}
              />
            </div>
          </div>
        )}

        <div>
          <Label htmlFor="max-turns">Max Turns</Label>
          <div className="flex items-center gap-3 mt-1">
            <Input
              id="max-turns"
              type="number"
              min="1"
              max="100"
              value={maxTurnsInput}
              onChange={(e) => {
                const value = e.target.value;
                setMaxTurnsInput(value);
                
                // Update parent state immediately if we have a valid number and not unlimited
                if (value !== '' && !isUnlimited) {
                  const numValue = Number.parseInt(value);
                  if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                    onMaxTurnsChange(numValue);
                  }
                }
              }}
              onBlur={(e) => {
                if (isUnlimited) return; // Don't process if unlimited is checked
                
                const value = e.target.value;
                if (value === '' || isNaN(Number.parseInt(value))) {
                  // Reset to default of 5 if empty or invalid
                  setMaxTurnsInput('5');
                  onMaxTurnsChange(5);
                } else {
                  const numValue = Number.parseInt(value);
                  if (numValue < 1) {
                    setMaxTurnsInput('1');
                    onMaxTurnsChange(1);
                  } else if (numValue > 100) {
                    setMaxTurnsInput('100');
                    onMaxTurnsChange(100);
                  }
                }
              }}
              className="w-24"
              disabled={isExperimentRunning || isUnlimited}
            />
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="unlimited-turns"
                checked={isUnlimited}
                onChange={(e) => {
                  const unlimited = e.target.checked;
                  setIsUnlimited(unlimited);
                  
                  if (unlimited) {
                    // Set to unlimited (-1)
                    onMaxTurnsChange(-1);
                  } else {
                    // Set to the current input value or default to 5
                    const numValue = Number.parseInt(maxTurnsInput);
                    if (!isNaN(numValue) && numValue >= 1 && numValue <= 100) {
                      onMaxTurnsChange(numValue);
                    } else {
                      setMaxTurnsInput('5');
                      onMaxTurnsChange(5);
                    }
                  }
                }}
                disabled={isExperimentRunning}
                className="h-4 w-4"
              />
              <Label htmlFor="unlimited-turns" className="text-sm text-gray-600">
                No Limit
              </Label>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          {!isExperimentRunning ? (
            <Button onClick={onStartExperiment} disabled={!canStartExperiment} className="flex-1" size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Experiment
            </Button>
          ) : (
            <Button 
              onClick={onStopExperiment}
              variant="destructive" 
              className="flex-1" 
              size="lg"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop Experiment
            </Button>
          )}
          
          {hasCompletedExperiment && !isExperimentRunning && (
            <DownloadButton 
              onDownloadHTML={onDownloadReportHTML}
              onDownloadPDF={onDownloadReportPDF} 
              className="flex-shrink-0"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
