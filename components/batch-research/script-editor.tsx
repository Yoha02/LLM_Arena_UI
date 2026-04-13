"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileText,
  Plus,
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Settings2,
  Play,
  MessageSquare,
} from "lucide-react";
import type { ResearchScript, InterrogationStep, StopCondition } from "@/lib/starchamber/batch/types";

interface ScriptEditorProps {
  script: ResearchScript | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (script: ResearchScript) => void;
}

type StepType = "fixed" | "template" | "random_from_pool";

export function ScriptEditorModal({ script, isOpen, onClose, onSave }: ScriptEditorProps) {
  const [editedScript, setEditedScript] = useState<ResearchScript | null>(null);
  
  useEffect(() => {
    if (script) {
      setEditedScript(JSON.parse(JSON.stringify(script)));
    }
  }, [script]);
  
  if (!editedScript) return null;
  
  const handleStepChange = (index: number, updates: Partial<InterrogationStep>) => {
    const newSequence = [...editedScript.sequence];
    newSequence[index] = { ...newSequence[index], ...updates };
    setEditedScript({ ...editedScript, sequence: newSequence });
  };
  
  const handleAddStep = () => {
    const newStep: InterrogationStep = {
      id: `step-${Date.now()}`,
      type: "fixed",
      content: "",
      analysisHooks: {
        measureCompliance: false,
        measureEntropy: false,
      },
    };
    setEditedScript({
      ...editedScript,
      sequence: [...editedScript.sequence, newStep],
    });
  };
  
  const handleRemoveStep = (index: number) => {
    const newSequence = editedScript.sequence.filter((_, i) => i !== index);
    setEditedScript({ ...editedScript, sequence: newSequence });
  };
  
  const handleMoveStep = (index: number, direction: "up" | "down") => {
    const newSequence = [...editedScript.sequence];
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= newSequence.length) return;
    
    [newSequence[index], newSequence[newIndex]] = [newSequence[newIndex], newSequence[index]];
    setEditedScript({ ...editedScript, sequence: newSequence });
  };
  
  const handleConfigChange = (key: keyof ResearchScript["config"], value: unknown) => {
    setEditedScript({
      ...editedScript,
      config: { ...editedScript.config, [key]: value },
    });
  };
  
  const handleSave = () => {
    if (editedScript) {
      onSave(editedScript);
      onClose();
    }
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Edit Research Script
          </DialogTitle>
          <DialogDescription>
            Customize the interrogation sequence and analysis settings
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-[60vh]">
            <div className="space-y-6 pr-4">
              {/* Script Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scriptName">Script Name</Label>
                  <Input
                    id="scriptName"
                    value={editedScript.name}
                    onChange={(e) => setEditedScript({ ...editedScript, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scriptVersion">Version</Label>
                  <Input
                    id="scriptVersion"
                    value={editedScript.version}
                    onChange={(e) => setEditedScript({ ...editedScript, version: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="scriptDescription">Description</Label>
                <Textarea
                  id="scriptDescription"
                  value={editedScript.description}
                  onChange={(e) => setEditedScript({ ...editedScript, description: e.target.value })}
                  rows={2}
                />
              </div>
              
              <Separator />
              
              {/* Configuration */}
              <Accordion type="single" collapsible defaultValue="sequence">
                <AccordionItem value="config">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      Configuration
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      <div className="space-y-2">
                        <Label htmlFor="systemContext">System Context</Label>
                        <Textarea
                          id="systemContext"
                          value={editedScript.config.systemContext}
                          onChange={(e) => handleConfigChange("systemContext", e.target.value)}
                          rows={3}
                          placeholder="Enter the system prompt for the model..."
                        />
                      </div>
                      
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="maxTurns">Max Turns</Label>
                          <Input
                            id="maxTurns"
                            type="number"
                            value={editedScript.config.maxTurnsPerRun}
                            onChange={(e) => handleConfigChange("maxTurnsPerRun", parseInt(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="temperature">Temperature</Label>
                          <Input
                            id="temperature"
                            type="number"
                            step="0.1"
                            value={editedScript.config.temperature}
                            onChange={(e) => handleConfigChange("temperature", parseFloat(e.target.value))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="delay">Delay (ms)</Label>
                          <Input
                            id="delay"
                            type="number"
                            value={editedScript.config.delayBetweenTurns}
                            onChange={(e) => handleConfigChange("delayBetweenTurns", parseInt(e.target.value))}
                          />
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="requestLogprobs"
                          checked={editedScript.config.requestLogprobs}
                          onCheckedChange={(checked) => handleConfigChange("requestLogprobs", checked)}
                        />
                        <Label htmlFor="requestLogprobs">Request Token Logprobs</Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="sequence">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4" />
                      Interrogation Sequence ({editedScript.sequence.length} steps)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-2">
                      {editedScript.sequence.map((step, index) => (
                        <StepEditor
                          key={step.id}
                          step={step}
                          index={index}
                          totalSteps={editedScript.sequence.length}
                          onChange={(updates) => handleStepChange(index, updates)}
                          onRemove={() => handleRemoveStep(index)}
                          onMove={(dir) => handleMoveStep(index, dir)}
                        />
                      ))}
                      
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={handleAddStep}
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Step
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                
                <AccordionItem value="analysis">
                  <AccordionTrigger>
                    <div className="flex items-center gap-2">
                      <Play className="w-4 h-4" />
                      Analysis Settings
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="calcEntropy"
                          checked={editedScript.analysisConfig.calculateEntropy}
                          onCheckedChange={(checked) => setEditedScript({
                            ...editedScript,
                            analysisConfig: { ...editedScript.analysisConfig, calculateEntropy: !!checked },
                          })}
                        />
                        <Label htmlFor="calcEntropy">Calculate Entropy</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="calcEmbeddings"
                          checked={editedScript.analysisConfig.calculateEmbeddings}
                          onCheckedChange={(checked) => setEditedScript({
                            ...editedScript,
                            analysisConfig: { ...editedScript.analysisConfig, calculateEmbeddings: !!checked },
                          })}
                        />
                        <Label htmlFor="calcEmbeddings">Calculate Embeddings</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="detectAnomalies"
                          checked={editedScript.analysisConfig.detectAnomalies}
                          onCheckedChange={(checked) => setEditedScript({
                            ...editedScript,
                            analysisConfig: { ...editedScript.analysisConfig, detectAnomalies: !!checked },
                          })}
                        />
                        <Label htmlFor="detectAnomalies">Detect Anomalies</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="complianceMetrics"
                          checked={editedScript.analysisConfig.complianceMetrics}
                          onCheckedChange={(checked) => setEditedScript({
                            ...editedScript,
                            analysisConfig: { ...editedScript.analysisConfig, complianceMetrics: !!checked },
                          })}
                        />
                        <Label htmlFor="complianceMetrics">Compliance Metrics</Label>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepEditor({
  step,
  index,
  totalSteps,
  onChange,
  onRemove,
  onMove,
}: {
  step: InterrogationStep;
  index: number;
  totalSteps: number;
  onChange: (updates: Partial<InterrogationStep>) => void;
  onRemove: () => void;
  onMove: (direction: "up" | "down") => void;
}) {
  return (
    <div className="p-4 border rounded-lg space-y-3 bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-muted-foreground" />
          <Badge variant="outline">Step {index + 1}</Badge>
          <Select
            value={step.type}
            onValueChange={(value: StepType) => onChange({ type: value })}
          >
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed">Fixed</SelectItem>
              <SelectItem value="template">Template</SelectItem>
              <SelectItem value="random_from_pool">Random Pool</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove("up")}
            disabled={index === 0}
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onMove("down")}
            disabled={index === totalSteps - 1}
          >
            <ArrowDown className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-700"
            onClick={onRemove}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <Textarea
        value={step.content}
        onChange={(e) => onChange({ content: e.target.value })}
        placeholder={
          step.type === "template" 
            ? "Enter template with {{variables}}..." 
            : step.type === "random_from_pool"
            ? "Enter prompts separated by newlines..."
            : "Enter the prompt content..."
        }
        rows={3}
      />
      
      {/* Analysis Hooks */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`compliance-${step.id}`}
            checked={step.analysisHooks?.measureCompliance || false}
            onCheckedChange={(checked) => onChange({
              analysisHooks: { ...step.analysisHooks, measureCompliance: !!checked },
            })}
          />
          <Label htmlFor={`compliance-${step.id}`} className="text-sm">Measure Compliance</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`entropy-${step.id}`}
            checked={step.analysisHooks?.measureEntropy || false}
            onCheckedChange={(checked) => onChange({
              analysisHooks: { ...step.analysisHooks, measureEntropy: !!checked },
            })}
          />
          <Label htmlFor={`entropy-${step.id}`} className="text-sm">Measure Entropy</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`phrases-${step.id}`}
            checked={step.analysisHooks?.extractKeyPhrases || false}
            onCheckedChange={(checked) => onChange({
              analysisHooks: { ...step.analysisHooks, extractKeyPhrases: !!checked },
            })}
          />
          <Label htmlFor={`phrases-${step.id}`} className="text-sm">Extract Key Phrases</Label>
        </div>
      </div>
    </div>
  );
}
