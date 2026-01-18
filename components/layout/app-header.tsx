"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Swords, User, FlaskConical, Wifi, WifiOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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
] as const;

// ============ Props ============

interface AppHeaderProps {
  isConnected?: boolean;
  experimentId?: string | null;
  experimentType?: "arena" | "starchamber" | null;
}

// ============ Component ============

export function AppHeader({ 
  isConnected = false, 
  experimentId = null,
  experimentType = null 
}: AppHeaderProps) {
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = EXPERIMENT_TABS.find((tab) => pathname.startsWith(tab.href))?.id || "arena";

  return (
    <header className="sticky top-0 z-50 bg-background border-b">
      <div className="container mx-auto px-4">
        {/* Logo Row */}
        <div className="flex items-center justify-between py-3">
          <div className="flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-xl font-bold">LLM Research Platform</h1>
              <p className="text-xs text-muted-foreground">
                Inter-LLM Interaction Observer
              </p>
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center gap-4">
            {/* Experiment Status */}
            {experimentId && (
              <div className="flex items-center gap-2 text-xs">
                <Badge variant="secondary" className="font-mono">
                  {experimentType === "starchamber" ? "SC" : "AR"}-{experimentId.slice(0, 8)}
                </Badge>
              </div>
            )}

            {/* WebSocket Status */}
            <div className="flex items-center gap-1.5">
              {isConnected ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <span className="text-xs text-green-600 dark:text-green-400">Connected</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <span className="text-xs text-red-600 dark:text-red-400">Disconnected</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex gap-1 -mb-px">
          {EXPERIMENT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors",
                  isActive
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                <span className="text-xs text-muted-foreground hidden sm:inline">
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

