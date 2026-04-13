"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Swords, User, FlaskConical } from "lucide-react";

// ============ Tab Configuration ============

const EXPERIMENT_TABS = [
  {
    id: "arena",
    label: "LLM Arena",
    href: "/arena",
    icon: Swords,
    description: "Model vs Model",
  },
  {
    id: "starchamber",
    label: "StarChamber",
    href: "/starchamber",
    icon: User,
    description: "Direct Interrogation",
  },
  {
    id: "batch-research",
    label: "Batch Research",
    href: "/batch-research",
    icon: FlaskConical,
    description: "Automated Studies",
  },
] as const;

// ============ Props ============

interface AppHeaderProps {
  isConnected?: boolean;
  experimentId?: string | null;
  experimentType?: "arena" | "starchamber" | null;
  batchStatus?: "idle" | "running" | "completed";
}

// ============ Component ============

export function AppHeader({ 
  isConnected = false,
  batchStatus,
}: AppHeaderProps) {
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = EXPERIMENT_TABS.find((tab) => pathname.startsWith(tab.href))?.id || "arena";
  
  // Check if we're on the batch research page
  const isBatchResearchPage = pathname.startsWith("/batch-research");
  
  // Determine status indicator based on page type
  const getStatusIndicator = () => {
    if (isBatchResearchPage) {
      if (batchStatus === "running") {
        return { color: "bg-blue-500 animate-pulse", text: "Running", textColor: "text-blue-600" };
      }
      if (batchStatus === "completed") {
        return { color: "bg-green-500", text: "Completed", textColor: "text-green-600" };
      }
      return { color: "bg-gray-400", text: "Idle", textColor: "text-muted-foreground" };
    }
    // Default WebSocket status for other pages
    return isConnected 
      ? { color: "bg-green-500", text: "Connected", textColor: "text-muted-foreground" }
      : { color: "bg-red-500", text: "Disconnected", textColor: "text-red-500" };
  };
  
  const status = getStatusIndicator();

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-6">
        {/* Title Row - Clean and Professional */}
        <div className="flex items-center justify-between pt-3 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              LLM Arena:
              <span className="font-normal text-muted-foreground ml-2 text-xl">
                Inter-LLM Interaction Observer
              </span>
            </h1>
            <p className="text-xs text-muted-foreground">AI Behavioral Research Platform</p>
          </div>
          
          {/* Connection/Status indicator */}
          <div className="flex items-center gap-2">
            <div className={cn("w-2 h-2 rounded-full", status.color)} />
            <span className={cn("text-sm", status.textColor)}>
              {status.text}
            </span>
          </div>
        </div>

        {/* Tab Navigation - Underlined style */}
        <nav className="flex gap-8 -mb-px border-t border-border/40 pt-3">
          {EXPERIMENT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-muted-foreground font-normal">
                  ({tab.description})
                </span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

