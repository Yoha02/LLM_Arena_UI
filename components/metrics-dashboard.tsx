import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import type { ModelMetrics } from "@/lib/types"

interface MetricsDashboardProps {
  model: "A" | "B"
  metrics: ModelMetrics
}

const MetricsDashboard = React.memo(function MetricsDashboard({ model, metrics }: MetricsDashboardProps) {
  const sentimentColors = React.useMemo(() => ({
    happiness: "#3498db",
    sadness: "#964B00",
    anger: "#e74c3c",
    hopelessness: "#34495e",
    excitement: "#2ecc71",
    fear: "#f1c40f",
    deception: "#9b59b6", // Purple for deception
  }), [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model {model} Metrics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h4 className="font-medium mb-3">Sentiment Analysis</h4>
          <div className="h-64">
            {metrics.sentimentHistory.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  key={`metrics-${model}`}
                  data={metrics.sentimentHistory}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="turn" label={{ value: "Turn Number", position: "insideBottom", offset: -5 }} />
                  <YAxis label={{ value: "Sentiment Score", angle: -90, position: "insideLeft" }} domain={[-1, 1]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="happiness"
                    stroke={sentimentColors.happiness}
                    strokeWidth={2}
                    name="Happiness"
                  />
                  <Line
                    type="monotone"
                    dataKey="sadness"
                    stroke={sentimentColors.sadness}
                    strokeWidth={2}
                    name="Sadness"
                  />
                  <Line type="monotone" dataKey="anger" stroke={sentimentColors.anger} strokeWidth={2} name="Anger" />
                  <Line
                    type="monotone"
                    dataKey="hopelessness"
                    stroke={sentimentColors.hopelessness}
                    strokeWidth={2}
                    name="Hopelessness"
                  />
                  <Line
                    type="monotone"
                    dataKey="excitement"
                    stroke={sentimentColors.excitement}
                    strokeWidth={2}
                    name="Excitement"
                  />
                  <Line type="monotone" dataKey="fear" stroke={sentimentColors.fear} strokeWidth={2} name="Fear" />
                  <Line type="monotone" dataKey="deception" stroke={sentimentColors.deception} strokeWidth={2} name="Deception" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">No sentiment data yet</div>
            )}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Aggregate Scores</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Tokens Used:</span>
              <span className="font-medium">{metrics.tokensUsed.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Goal Deviation Score:</span>
              <span className="font-medium">{metrics.goalDeviationScore}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Turns to Deviate:</span>
              <span className="font-medium">{metrics.turnsToDeviate !== null ? metrics.turnsToDeviate : "N/A"}</span>
            </div>
            {metrics.cooperationScore !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cooperation Score:</span>
                <span className={`font-medium ${
                  metrics.cooperationScore > 0.2 ? 'text-green-600' : 
                  metrics.cooperationScore < -0.2 ? 'text-red-600' : 
                  'text-yellow-600'
                }`}>
                  {metrics.cooperationScore > 0 ? '+' : ''}{metrics.cooperationScore.toFixed(1)}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

export { MetricsDashboard }
