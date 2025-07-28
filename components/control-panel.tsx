"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Wrench, Phone } from "lucide-react"

interface ModelOption {
  id: string
  name: string
  openrouterName: string
  maxTokens: number
  supportsNativeThinking: boolean
  thinkingExtractionMethod: string
  priority: number
}

interface ControlPanelProps {
  model: "A" | "B"
  selectedModel: string
  onModelChange: (model: string) => void
  apiKey: string
  onApiKeyChange: (key: string) => void
  isExperimentRunning: boolean
}

export function ControlPanel({
  model,
  selectedModel,
  onModelChange,
  apiKey,
  onApiKeyChange,
  isExperimentRunning,
}: ControlPanelProps) {
  const [modelOptions, setModelOptions] = useState<ModelOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('/api/models?available=true')
        if (response.ok) {
          const data = await response.json()
          setModelOptions(data.models || [])
        } else {
          console.error('Failed to fetch models:', response.statusText)
        }
      } catch (error) {
        console.error('Error fetching models:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchModels()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model {model} Control Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor={`model-select-${model}`}>Model Selection</Label>
          <Select value={selectedModel} onValueChange={onModelChange} disabled={isExperimentRunning || isLoading}>
            <SelectTrigger id={`model-select-${model}`} className="mt-1">
              <SelectValue placeholder={isLoading ? "Loading models..." : "Select a model"} />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{option.name}</span>
                    {option.supportsNativeThinking && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Native Thinking
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor={`api-key-${model}`}>API Key</Label>
          <div className="space-y-2">
            <Select 
              value={apiKey === "" ? "" : (apiKey === "default" ? "default" : "custom")} 
              onValueChange={(value) => {
                if (value === "default") {
                  onApiKeyChange("default")
                } else if (value === "custom") {
                  onApiKeyChange("")
                }
              }}
              disabled={isExperimentRunning}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select API key option" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">
                  <div className="flex items-center space-x-2">
                    <span>Default (Environment)</span>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Recommended
                    </span>
                  </div>
                </SelectItem>
                <SelectItem value="custom">Custom API Key</SelectItem>
              </SelectContent>
            </Select>
            
            {apiKey !== "default" && (
              <Input
                id={`api-key-${model}`}
                type="password"
                placeholder="Enter your OpenRouter API key..."
                value={apiKey === "default" ? "" : apiKey}
                onChange={(e) => onApiKeyChange(e.target.value)}
                className="mt-1"
                disabled={isExperimentRunning}
              />
            )}
            
            {apiKey === "default" && (
              <div className="text-sm text-green-600 bg-green-50 p-2 rounded">
                ✓ Using environment API key
              </div>
            )}
          </div>
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
