"use client";

import { useState, useEffect } from "react";
import { AppHeader } from "@/components/layout/app-header";
import { Toaster } from "@/components/ui/toaster";

// ============ Experiments Layout ============
// Shared layout for Arena and StarChamber routes
// Provides the tabbed header and common providers

interface ExperimentsLayoutProps {
  children: React.ReactNode;
}

export default function ExperimentsLayout({ children }: ExperimentsLayoutProps) {
  // Track WebSocket connection status at the layout level
  // This will be updated by child components via context or props
  const [isConnected, setIsConnected] = useState(false);
  const [experimentId, setExperimentId] = useState<string | null>(null);
  const [experimentType, setExperimentType] = useState<"arena" | "starchamber" | null>(null);

  // Listen for connection status changes from child components
  useEffect(() => {
    const handleConnectionChange = (event: CustomEvent) => {
      setIsConnected(event.detail.isConnected);
    };
    
    const handleExperimentChange = (event: CustomEvent) => {
      setExperimentId(event.detail.experimentId);
      setExperimentType(event.detail.experimentType);
    };

    window.addEventListener("ws-connection-change" as any, handleConnectionChange);
    window.addEventListener("experiment-change" as any, handleExperimentChange);

    return () => {
      window.removeEventListener("ws-connection-change" as any, handleConnectionChange);
      window.removeEventListener("experiment-change" as any, handleExperimentChange);
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader 
        isConnected={isConnected}
        experimentId={experimentId}
        experimentType={experimentType}
      />
      <main className="container mx-auto px-4 py-6">
        {children}
      </main>
      <Toaster />
    </div>
  );
}

// ============ Utility functions for child components ============
// These can be called by Arena/StarChamber pages to update the header

export function notifyConnectionChange(isConnected: boolean) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("ws-connection-change", {
        detail: { isConnected },
      })
    );
  }
}

export function notifyExperimentChange(
  experimentId: string | null,
  experimentType: "arena" | "starchamber" | null
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("experiment-change", {
        detail: { experimentId, experimentType },
      })
    );
  }
}

