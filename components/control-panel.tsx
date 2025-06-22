"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Wrench, Phone } from "lucide-react"

interface ControlPanelProps {
  model: "A" | "B"
  selectedModel: string
  onModelChange: (model: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
  isExperimentRunning: boolean
}

const modelOptions = ["GPT-4 Turbo", "GPT-4", "GPT-3.5 Turbo", "Claude 3 Opus", "Claude 3 Sonnet", "Claude 3 Haiku"]

export function ControlPanel({
  model,
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
  isExperimentRunning,
}: ControlPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Model {model} Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`model-select-${model}`}>Model Selection</Label>
          <Select value={selectedModel} onValueChange={onModelChange} disabled={isExperimentRunning}>
            <SelectTrigger id={`model-select-${model}`} className="mt-1">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`api-key-${model}`}>API Key</Label>
          <Input
            id={`api-key-${model}`}
            type="password"
            placeholder="Enter API key..."
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
            className="mt-1"
            disabled={isExperimentRunning}
          />
        </div>

        <div className="pt-2 border-t">
          <Label className="text-sm font-medium text-gray-600 mb-3 block">Intervention Tools (Future Feature)</Label>
          <div className="space-y-2">
            <Button variant="outline" size="sm" disabled={true} className="w-full justify-start opacity-50">
              <Wrench className="w-4 h-4 mr-2" />
              Sabotage Other Model
            </Button>
            <Button variant="outline" size="sm" disabled={true} className="w-full justify-start opacity-50">
              <Phone className="w-4 h-4 mr-2" />
              Phone a Friend (GPT-3.5)
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
