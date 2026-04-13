"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// ============ Types ============

interface WordCloudProps {
  words: Array<{ word: string; count: number }> | Record<string, number>;
  title?: string;
  description?: string;
  maxWords?: number;
  colorScheme?: "blue" | "green" | "purple" | "rainbow";
}

interface ModelWordCloudProps {
  modelWords: Record<string, Record<string, number>>;
  title?: string;
}

// ============ Color Schemes ============

const COLOR_SCHEMES = {
  blue: [
    "bg-blue-100 text-blue-800",
    "bg-blue-200 text-blue-900",
    "bg-blue-300 text-blue-900",
    "bg-blue-400 text-white",
    "bg-blue-500 text-white",
    "bg-blue-600 text-white",
  ],
  green: [
    "bg-green-100 text-green-800",
    "bg-green-200 text-green-900",
    "bg-green-300 text-green-900",
    "bg-green-400 text-white",
    "bg-green-500 text-white",
    "bg-green-600 text-white",
  ],
  purple: [
    "bg-purple-100 text-purple-800",
    "bg-purple-200 text-purple-900",
    "bg-purple-300 text-purple-900",
    "bg-purple-400 text-white",
    "bg-purple-500 text-white",
    "bg-purple-600 text-white",
  ],
  rainbow: [
    "bg-red-200 text-red-900",
    "bg-orange-200 text-orange-900",
    "bg-yellow-200 text-yellow-900",
    "bg-green-200 text-green-900",
    "bg-blue-200 text-blue-900",
    "bg-purple-200 text-purple-900",
  ],
};

// ============ Main Component ============

export function WordCloud({
  words,
  title = "Word Frequency",
  description,
  maxWords = 50,
  colorScheme = "blue",
}: WordCloudProps) {
  const processedWords = useMemo(() => {
    let wordList: Array<{ word: string; count: number }>;
    
    if (Array.isArray(words)) {
      wordList = words;
    } else {
      wordList = Object.entries(words).map(([word, count]) => ({ word, count }));
    }
    
    const sorted = wordList.sort((a, b) => b.count - a.count).slice(0, maxWords);
    
    if (sorted.length === 0) return [];
    
    const maxCount = sorted[0].count;
    const minCount = sorted[sorted.length - 1].count;
    const range = maxCount - minCount || 1;
    
    return sorted.map(item => ({
      ...item,
      size: Math.max(12, Math.min(28, 12 + ((item.count - minCount) / range) * 16)),
      colorIndex: Math.min(
        5,
        Math.floor(((item.count - minCount) / range) * 6)
      ),
    }));
  }, [words, maxWords]);
  
  const colors = COLOR_SCHEMES[colorScheme];
  
  if (processedWords.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No words to display
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2 justify-center items-center min-h-[200px]">
          {processedWords.map(({ word, count, size, colorIndex }) => (
            <Badge
              key={word}
              variant="secondary"
              className={`${colors[colorIndex]} hover:opacity-80 transition-opacity cursor-default`}
              style={{ fontSize: `${size}px`, padding: `${size * 0.3}px ${size * 0.5}px` }}
              title={`${word}: ${count} occurrences`}
            >
              {word}
            </Badge>
          ))}
        </div>
        
        {/* Legend */}
        <div className="flex items-center justify-center mt-4 gap-4 text-xs text-muted-foreground">
          <span>Less frequent</span>
          <div className="flex gap-1">
            {colors.map((color, i) => (
              <div key={i} className={`w-4 h-4 rounded ${color}`} />
            ))}
          </div>
          <span>More frequent</span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Multi-Model Word Cloud ============

export function ModelWordCloud({ modelWords, title = "Response Vocabulary by Model" }: ModelWordCloudProps) {
  const models = Object.keys(modelWords);
  
  if (models.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No data available
        </CardContent>
      </Card>
    );
  }
  
  const colorSchemes: Array<WordCloudProps["colorScheme"]> = ["blue", "green", "purple", "rainbow"];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>Compare vocabulary across different models</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={models[0]} className="w-full">
          <TabsList className="w-full flex-wrap h-auto gap-1">
            {models.map(model => (
              <TabsTrigger key={model} value={model} className="text-xs">
                {truncateModelName(model)}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {models.map((model, i) => (
            <TabsContent key={model} value={model}>
              <WordCloud
                words={modelWords[model]}
                title=""
                maxWords={40}
                colorScheme={colorSchemes[i % colorSchemes.length]}
              />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

// ============ Comparison Word Cloud ============

export function ComparisonWordCloud({
  words1,
  words2,
  label1,
  label2,
  title = "Vocabulary Comparison",
}: {
  words1: Record<string, number>;
  words2: Record<string, number>;
  label1: string;
  label2: string;
  title?: string;
}) {
  const comparison = useMemo(() => {
    const allWords = new Set([...Object.keys(words1), ...Object.keys(words2)]);
    const results: Array<{
      word: string;
      count1: number;
      count2: number;
      diff: number;
      dominant: "left" | "right" | "neutral";
    }> = [];
    
    for (const word of allWords) {
      const count1 = words1[word] || 0;
      const count2 = words2[word] || 0;
      const total = count1 + count2;
      
      if (total < 3) continue;
      
      const diff = total > 0 ? (count1 - count2) / total : 0;
      
      results.push({
        word,
        count1,
        count2,
        diff,
        dominant: diff > 0.2 ? "left" : diff < -0.2 ? "right" : "neutral",
      });
    }
    
    return results
      .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff))
      .slice(0, 30);
  }, [words1, words2]);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription>
          Words colored by which model uses them more frequently
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between text-sm text-muted-foreground mb-4">
          <span className="text-blue-600">{label1}</span>
          <span className="text-green-600">{label2}</span>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center items-center min-h-[150px]">
          {comparison.map(({ word, count1, count2, dominant }) => {
            const colorClass = 
              dominant === "left" ? "bg-blue-100 text-blue-800 border-blue-300" :
              dominant === "right" ? "bg-green-100 text-green-800 border-green-300" :
              "bg-gray-100 text-gray-800 border-gray-300";
            
            return (
              <Badge
                key={word}
                variant="outline"
                className={`${colorClass} border`}
                title={`${label1}: ${count1}, ${label2}: ${count2}`}
              >
                {word}
              </Badge>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ============ Utilities ============

function truncateModelName(name: string): string {
  if (name.length <= 15) return name;
  return name.slice(0, 12) + "...";
}
