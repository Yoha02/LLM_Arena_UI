"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Play, Square } from "lucide-react"
import { DownloadButton } from "@/components/ui/download-button"

interface ExperimentSetupProps {
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
  onDownloadReport: () => Promise<void>
  hasCompletedExperiment: boolean
  isDemoMode?: boolean
}

export function ExperimentSetup({
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
  onDownloadReport,
  hasCompletedExperiment,
  isDemoMode = false,
}: ExperimentSetupProps) {
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

        <div>
          <Label className="text-base font-medium">Prompting Mode</Label>
          <RadioGroup
            value={promptingMode}
            onValueChange={(value) => onPromptingModeChange(value as "shared" | "individual")}
            className="flex flex-row space-x-6 mt-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="shared" id="shared" />
              <Label htmlFor="shared">Shared Prompt</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="individual" id="individual" />
              <Label htmlFor="individual">Individual Prompts</Label>
            </div>
          </RadioGroup>
        </div>

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
          <Input
            id="max-turns"
            type="number"
            min="1"
            max="100"
            value={maxTurns}
            onChange={(e) => onMaxTurnsChange(Number.parseInt(e.target.value) || 30)}
            className="w-24 mt-1"
            disabled={isExperimentRunning}
          />
        </div>

        <div className="flex gap-2">
          {!isExperimentRunning ? (
            <Button onClick={onStartExperiment} disabled={!canStartExperiment} className="flex-1" size="lg">
              <Play className="w-4 h-4 mr-2" />
              Start Experiment
            </Button>
          ) : (
            <Button onClick={onStopExperiment} variant="destructive" className="flex-1" size="lg">
              <Square className="w-4 h-4 mr-2" />
              Stop Experiment
            </Button>
          )}
          
          {hasCompletedExperiment && !isExperimentRunning && (
            <DownloadButton 
              onDownload={onDownloadReport} 
              className="flex-shrink-0"
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}
