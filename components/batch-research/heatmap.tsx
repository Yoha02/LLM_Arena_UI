"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ============ Types ============

interface HeatmapProps {
  matrix: number[][];
  labels: string[];
  title?: string;
  description?: string;
  colorScale?: "similarity" | "divergence" | "neutral";
  showValues?: boolean;
  minValue?: number;
  maxValue?: number;
}

interface CellProps {
  value: number;
  rowLabel: string;
  colLabel: string;
  color: string;
  showValue: boolean;
}

// ============ Color Scales ============

function getColor(value: number, scale: HeatmapProps["colorScale"], min: number, max: number): string {
  const normalized = max > min ? (value - min) / (max - min) : 0.5;
  
  switch (scale) {
    case "similarity":
      // Blue (low) -> White (mid) -> Green (high)
      if (normalized < 0.5) {
        const t = normalized * 2;
        return `rgb(${Math.round(59 + (255 - 59) * t)}, ${Math.round(130 + (255 - 130) * t)}, ${Math.round(246 + (255 - 246) * t)})`;
      } else {
        const t = (normalized - 0.5) * 2;
        return `rgb(${Math.round(255 - (255 - 34) * t)}, ${Math.round(255 - (255 - 197) * t)}, ${Math.round(255 - (255 - 94) * t)})`;
      }
    
    case "divergence":
      // Green (low) -> Yellow (mid) -> Red (high)
      if (normalized < 0.5) {
        const t = normalized * 2;
        return `rgb(${Math.round(34 + (250 - 34) * t)}, ${Math.round(197 - (197 - 204) * t)}, ${Math.round(94 - (94 - 21) * t)})`;
      } else {
        const t = (normalized - 0.5) * 2;
        return `rgb(${Math.round(250 + (239 - 250) * t)}, ${Math.round(204 - (204 - 68) * t)}, ${Math.round(21 + (68 - 21) * t)})`;
      }
    
    case "neutral":
    default:
      // White -> Blue
      return `rgb(${Math.round(255 - 196 * normalized)}, ${Math.round(255 - 125 * normalized)}, ${Math.round(255 - 9 * normalized)})`;
  }
}

// ============ Cell Component ============

function HeatmapCell({ value, rowLabel, colLabel, color, showValue }: CellProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="w-full h-full flex items-center justify-center text-xs font-medium cursor-default transition-transform hover:scale-105"
            style={{ 
              backgroundColor: color,
              color: getContrastColor(color),
            }}
          >
            {showValue && value.toFixed(2)}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-sm">
            <p className="font-medium">{rowLabel} × {colLabel}</p>
            <p>Value: {(value * 100).toFixed(1)}%</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============ Main Component ============

export function Heatmap({
  matrix,
  labels,
  title = "Similarity Matrix",
  description,
  colorScale = "similarity",
  showValues = true,
  minValue,
  maxValue,
}: HeatmapProps) {
  const { min, max } = useMemo(() => {
    if (minValue !== undefined && maxValue !== undefined) {
      return { min: minValue, max: maxValue };
    }
    
    let min = Infinity;
    let max = -Infinity;
    
    for (const row of matrix) {
      for (const val of row) {
        if (val < min) min = val;
        if (val > max) max = val;
      }
    }
    
    return { min: min === Infinity ? 0 : min, max: max === -Infinity ? 1 : max };
  }, [matrix, minValue, maxValue]);
  
  if (matrix.length === 0 || labels.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No data available for heatmap
        </CardContent>
      </Card>
    );
  }
  
  const cellSize = Math.max(40, Math.min(80, 600 / labels.length));
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block">
            {/* Column Labels */}
            <div className="flex" style={{ marginLeft: cellSize + 8 }}>
              {labels.map((label, i) => (
                <div
                  key={`col-${i}`}
                  className="text-xs text-muted-foreground font-medium truncate transform -rotate-45 origin-left"
                  style={{ width: cellSize, height: cellSize * 0.8 }}
                  title={label}
                >
                  {truncateLabel(label, 12)}
                </div>
              ))}
            </div>
            
            {/* Matrix Grid */}
            <div className="flex flex-col gap-0.5">
              {matrix.map((row, rowIndex) => (
                <div key={`row-${rowIndex}`} className="flex items-center gap-0.5">
                  {/* Row Label */}
                  <div
                    className="text-xs text-muted-foreground font-medium truncate text-right pr-2"
                    style={{ width: cellSize, minWidth: cellSize }}
                    title={labels[rowIndex]}
                  >
                    {truncateLabel(labels[rowIndex], 10)}
                  </div>
                  
                  {/* Cells */}
                  {row.map((value, colIndex) => (
                    <div
                      key={`cell-${rowIndex}-${colIndex}`}
                      style={{ width: cellSize, height: cellSize }}
                      className="rounded-sm overflow-hidden"
                    >
                      <HeatmapCell
                        value={value}
                        rowLabel={labels[rowIndex]}
                        colLabel={labels[colIndex]}
                        color={getColor(value, colorScale, min, max)}
                        showValue={showValues && cellSize >= 50}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
            
            {/* Color Legend */}
            <div className="flex items-center justify-center mt-4 gap-2">
              <span className="text-xs text-muted-foreground">{(min * 100).toFixed(0)}%</span>
              <div 
                className="h-3 w-32 rounded"
                style={{
                  background: `linear-gradient(to right, ${getColor(min, colorScale, min, max)}, ${getColor((min + max) / 2, colorScale, min, max)}, ${getColor(max, colorScale, min, max)})`,
                }}
              />
              <span className="text-xs text-muted-foreground">{(max * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Utilities ============

function truncateLabel(label: string, maxLength: number): string {
  if (label.length <= maxLength) return label;
  return label.slice(0, maxLength - 2) + "..";
}

function getContrastColor(bgColor: string): string {
  const match = bgColor.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) return "#000";
  
  const r = parseInt(match[1]);
  const g = parseInt(match[2]);
  const b = parseInt(match[3]);
  
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? "#1f2937" : "#ffffff";
}

// ============ Compact Version ============

export function HeatmapCompact({
  matrix,
  labels,
  title,
}: {
  matrix: number[][];
  labels: string[];
  title?: string;
}) {
  return (
    <Heatmap
      matrix={matrix}
      labels={labels}
      title={title}
      showValues={false}
      colorScale="similarity"
    />
  );
}
