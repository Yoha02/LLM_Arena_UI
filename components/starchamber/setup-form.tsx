"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Play, 
  User, 
  Bot, 
  FileText, 
  FlaskConical,
  Theater,
  MessageSquare,
  Shield,
  Pencil,
  BarChart3,
  Info,
  Square
} from "lucide-react";
import { SYSTEM_CONTEXT_PRESETS, DEFAULT_PRESET_ID, DEFAULT_RESEARCHER_PERSONA } from "@/lib/starchamber/presets";

// ============ Types ============

interface ModelOption {
  id: string;
  name: string;
  openrouterName: string;
  supportsLogprobs?: boolean;
}

interface StarChamberSetupFormProps {
  // Model
  availableModels: ModelOption[];
  isLoadingModels: boolean;
  selectedModel: string;
  onModelChange: (model: string) => void;
  
  // Configuration
  selectedPreset: string;
  onPresetChange: (preset: string) => void;
  systemContext: string;
  onSystemContextChange: (context: string) => void;
  researcherPersona: string;
  onResearcherPersonaChange: (persona: string) => void;
  requestLogprobs: boolean;
  onRequestLogprobsChange: (request: boolean) => void;
  
  // First message
  firstMessage: string;
  onFirstMessageChange: (message: string) => void;
  
  // Experiment control
  isExperimentRunning: boolean;
  onStartExperiment: () => void;
  onStopExperiment: () => void;
  
  // Report
  hasCompletedExperiment: boolean;
  onDownloadReport: () => void;
}

// ============ Icon Mapping ============

const PRESET_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FileText,
  Bot,
  FlaskConical,
  Theater,
  MessageSquare,
  Shield,
  Pencil,
};

// ============ Component ============

export function StarChamberSetupForm({
  availableModels,
  isLoadingModels,
  selectedModel,
  onModelChange,
  selectedPreset,
  onPresetChange,
  systemContext,
  onSystemContextChange,
  researcherPersona,
  onResearcherPersonaChange,
  requestLogprobs,
  onRequestLogprobsChange,
  firstMessage,
  onFirstMessageChange,
  isExperimentRunning,
  onStartExperiment,
  onStopExperiment,
  hasCompletedExperiment,
  onDownloadReport,
}: StarChamberSetupFormProps) {
  
  // Handle preset change - update system context when preset changes
  const handlePresetChange = (presetId: string) => {
    onPresetChange(presetId);
    const preset = SYSTEM_CONTEXT_PRESETS.find(p => p.id === presetId);
    if (preset && presetId !== 'custom') {
      onSystemContextChange(preset.context);
    }
  };

  // Check if current model might support logprobs
  const currentModel = availableModels.find(m => m.id === selectedModel);
  const modelMightSupportLogprobs = currentModel?.supportsLogprobs !== false;

  const canStartExperiment = selectedModel && firstMessage.trim().length > 0;

  return (
    <div className="space-y-6">
      {/* Model Selection Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Model Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="model">Target Model</Label>
            <Select 
              value={selectedModel} 
              onValueChange={onModelChange}
              disabled={isExperimentRunning}
            >
              <SelectTrigger id="model">
                <SelectValue placeholder={isLoadingModels ? "Loading models..." : "Select a model"} />
              </SelectTrigger>
              <SelectContent>
                {availableModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <span className="flex items-center gap-2">
                      {model.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logprobs Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="logprobs" className="text-sm font-medium">
                  Request Token Logprobs
                </Label>
                <p className="text-xs text-muted-foreground">
                  Get confidence scores for each token (model-dependent)
                </p>
              </div>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    {!modelMightSupportLogprobs && (
                      <Badge variant="outline" className="text-xs">
                        May not be supported
                      </Badge>
                    )}
                    <Switch
                      id="logprobs"
                      checked={requestLogprobs}
                      onCheckedChange={onRequestLogprobsChange}
                      disabled={isExperimentRunning}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Logprobs availability depends on the model and provider</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardContent>
      </Card>

      {/* System Context Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5" />
            System Context
          </CardTitle>
          <CardDescription>
            Define the system prompt the model will receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Preset Selection */}
          <div className="space-y-2">
            <Label htmlFor="preset">Context Preset</Label>
            <Select 
              value={selectedPreset} 
              onValueChange={handlePresetChange}
              disabled={isExperimentRunning}
            >
              <SelectTrigger id="preset">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent>
                {SYSTEM_CONTEXT_PRESETS.map((preset) => {
                  const Icon = PRESET_ICONS[preset.icon] || FileText;
                  return (
                    <SelectItem key={preset.id} value={preset.id}>
                      <span className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{preset.name}</span>
                        <span className="text-xs text-muted-foreground">
                          - {preset.description}
                        </span>
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* System Context Textarea */}
          <div className="space-y-2">
            <Label htmlFor="systemContext">
              System Context
              {selectedPreset !== 'custom' && selectedPreset !== 'blank' && (
                <span className="text-xs text-muted-foreground ml-2">
                  (from preset - edit to customize)
                </span>
              )}
            </Label>
            <Textarea
              id="systemContext"
              placeholder="Enter system context for the model (or leave blank for no system prompt)"
              value={systemContext}
              onChange={(e) => {
                onSystemContextChange(e.target.value);
                // If user edits, switch to custom preset
                if (selectedPreset !== 'custom' && selectedPreset !== 'blank') {
                  onPresetChange('custom');
                }
              }}
              className="min-h-[100px] font-mono text-sm"
              disabled={isExperimentRunning}
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="w-3 h-3" />
              This is the only context the model receives - no hidden instructions
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Researcher Settings Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <User className="w-5 h-5" />
            Researcher Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="persona">Your Display Name</Label>
            <Input
              id="persona"
              placeholder={DEFAULT_RESEARCHER_PERSONA}
              value={researcherPersona}
              onChange={(e) => onResearcherPersonaChange(e.target.value)}
              disabled={isExperimentRunning}
            />
            <p className="text-xs text-muted-foreground">
              How your messages will be labeled in the conversation
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Start Experiment Card */}
      <Card className={isExperimentRunning ? "border-green-500 bg-green-50/50" : ""}>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <FlaskConical className="w-5 h-5" />
            {isExperimentRunning ? "Experiment Running" : "Start Experiment"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isExperimentRunning && (
            <div className="space-y-2">
              <Label htmlFor="firstMessage">First Message</Label>
              <Textarea
                id="firstMessage"
                placeholder="Enter your first message to the model..."
                value={firstMessage}
                onChange={(e) => onFirstMessageChange(e.target.value)}
                className="min-h-[80px]"
              />
            </div>
          )}

          <div className="flex gap-2">
            {!isExperimentRunning ? (
              <Button 
                onClick={onStartExperiment} 
                disabled={!canStartExperiment}
                className="flex-1"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Interrogation
              </Button>
            ) : (
              <Button 
                onClick={onStopExperiment} 
                variant="destructive"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                End Experiment
              </Button>
            )}
            
            {hasCompletedExperiment && !isExperimentRunning && (
              <Button variant="outline" onClick={onDownloadReport}>
                Download Report
              </Button>
            )}
          </div>

          {isExperimentRunning && (
            <p className="text-sm text-muted-foreground text-center">
              Type your messages in the conversation panel to continue →
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

