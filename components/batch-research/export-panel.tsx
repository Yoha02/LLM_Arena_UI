"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageSquare,
  Printer,
} from "lucide-react";
import { BatchResearchPDFGenerator } from "@/lib/starchamber/batch/pdf-generator";
import { generateFullLatexReport } from "@/lib/starchamber/batch/export/latex";
import type { BatchResult } from "@/lib/starchamber/batch/types";

interface ExportPanelProps {
  batchId: string;
  batch?: BatchResult | null;
  disabled?: boolean;
}

type ExportFormat = "json" | "csv-summary" | "csv-conversations" | "csv-research" | "report" | "pdf" | "latex";

export function ExportPanel({ batchId, batch, disabled }: ExportPanelProps) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);

  const handleDownloadPDF = async () => {
    setLoading("pdf");
    try {
      let batchData = batch;
      
      // If batch not provided, fetch it
      if (!batchData) {
        const response = await fetch(`/api/batch/${batchId}/status`);
        if (!response.ok) throw new Error("Failed to fetch batch data");
        batchData = await response.json();
      }
      
      if (!batchData) {
        throw new Error("No batch data available");
      }
      
      await BatchResearchPDFGenerator.generateAndDownloadPDF(batchData);
    } catch (error) {
      console.error("PDF download error:", error);
      alert("Failed to generate PDF. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleLatexExport = async () => {
    setLoading("latex");
    try {
      let batchData = batch;
      if (!batchData) {
        const response = await fetch(`/api/batch/${batchId}/status`);
        if (!response.ok) throw new Error("Failed to fetch batch data");
        batchData = await response.json();
      }
      if (!batchData) throw new Error("No batch data available");
      
      const latex = generateFullLatexReport(batchData);
      const blob = new Blob([latex], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `batch-${batchId}-tables.tex`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("LaTeX export error:", error);
      alert("Failed to generate LaTeX. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleExport = async (format: ExportFormat) => {
    setLoading(format);
    
    try {
      let url: string;
      let filename: string;
      
      switch (format) {
        case "json":
          url = `/api/batch/${batchId}/export?format=json`;
          filename = `batch-${batchId}.json`;
          break;
        case "csv-summary":
          url = `/api/batch/${batchId}/export?format=csv&type=summary`;
          filename = `batch-${batchId}-summary.csv`;
          break;
        case "csv-conversations":
          url = `/api/batch/${batchId}/export?format=csv&type=conversations`;
          filename = `batch-${batchId}-conversations.csv`;
          break;
        case "csv-research":
          url = `/api/batch/${batchId}/export?format=csv&type=research`;
          filename = `batch-${batchId}-research-data.csv`;
          break;
        case "report":
          window.open(`/api/batch/${batchId}/export?format=report`, "_blank");
          setLoading(null);
          return;
        default:
          setLoading(null);
          return;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Export failed");
      }
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled || !!loading}>
          {loading ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => handleExport("json")}>
          <FileJson className="w-4 h-4 mr-2" />
          Download JSON
          <span className="ml-auto text-xs text-muted-foreground">Full data</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleExport("csv-summary")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV - Run Summary
          <span className="ml-auto text-xs text-muted-foreground">Metrics</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv-conversations")}>
          <MessageSquare className="w-4 h-4 mr-2" />
          CSV - Conversations
          <span className="ml-auto text-xs text-muted-foreground">All messages</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("csv-research")}>
          <FileSpreadsheet className="w-4 h-4 mr-2" />
          CSV - Research Data
          <span className="ml-auto text-xs text-muted-foreground">Per-turn</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handleLatexExport()}>
          <FileText className="w-4 h-4 mr-2" />
          LaTeX Tables
          <span className="ml-auto text-xs text-muted-foreground">.tex</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("report")}>
          <FileText className="w-4 h-4 mr-2" />
          View Report
          <span className="ml-auto text-xs text-muted-foreground">HTML</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownloadPDF()}>
          <Printer className="w-4 h-4 mr-2" />
          Download PDF
          <span className="ml-auto text-xs text-muted-foreground">PDF</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
