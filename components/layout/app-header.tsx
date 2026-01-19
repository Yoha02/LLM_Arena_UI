"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Swords, User } from "lucide-react";

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
}: AppHeaderProps) {
  const pathname = usePathname();

  // Determine active tab from pathname
  const activeTab = EXPERIMENT_TABS.find((tab) => pathname.startsWith(tab.href))?.id || "arena";

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
          
          {/* Connection Status - Subtle indicator */}
          <div className="flex items-center gap-2">
            <div 
              className={cn(
                "w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-red-500"
              )}
            />
            <span className={cn(
              "text-sm",
              isConnected ? "text-muted-foreground" : "text-red-500"
            )}>
              {isConnected ? "Connected" : "Disconnected"}
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

