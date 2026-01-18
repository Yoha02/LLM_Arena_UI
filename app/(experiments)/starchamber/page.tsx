"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Bot, FlaskConical, Construction } from "lucide-react";
import { notifyConnectionChange, notifyExperimentChange } from "../layout";

export default function StarChamberPage() {
  // Notify layout that we're on StarChamber (no experiment running yet)
  useEffect(() => {
    notifyExperimentChange(null, null);
  }, []);

  return (
    <div className="space-y-6">
      {/* Coming Soon Banner */}
      <Card className="border-dashed border-2 border-primary/50 bg-primary/5">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <FlaskConical className="w-16 h-16 text-primary" />
              <Construction className="w-8 h-8 text-yellow-500 absolute -bottom-1 -right-1" />
            </div>
          </div>
          <CardTitle className="text-2xl">StarChamber</CardTitle>
          <CardDescription className="text-base">
            Direct Human-LLM Interrogation Mode
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <Badge variant="secondary" className="text-sm px-4 py-1">
            Coming Soon
          </Badge>
          
          <p className="text-muted-foreground max-w-lg mx-auto">
            StarChamber enables researchers to have direct one-on-one conversations with a single LLM,
            observing thinking traces, sentiment analysis, and token confidence in real-time.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 max-w-2xl mx-auto">
            <FeatureCard
              icon={<User className="w-6 h-6" />}
              title="Direct Interrogation"
              description="One-on-one conversation with full control"
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="Thinking Traces"
              description="See the model's reasoning process"
            />
            <FeatureCard
              icon={<FlaskConical className="w-6 h-6" />}
              title="Token Analysis"
              description="Confidence scoring per token (when available)"
            />
          </div>

          <div className="pt-4">
            <Button variant="outline" disabled>
              <Construction className="w-4 h-4 mr-2" />
              Under Construction
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description 
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
}) {
  return (
    <div className="p-4 rounded-lg bg-background border">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="text-primary">{icon}</div>
        <h3 className="font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

