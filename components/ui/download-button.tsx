"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Download, FileText, ChevronDown, Loader2 } from "lucide-react"

interface DownloadButtonProps {
  onDownloadHTML: () => Promise<void>
  onDownloadPDF: () => Promise<void>
  disabled?: boolean
  className?: string
}

export function DownloadButton({ onDownloadHTML, onDownloadPDF, disabled = false, className = "" }: DownloadButtonProps) {
  const [isDownloadingHTML, setIsDownloadingHTML] = useState(false)
  const [isDownloadingPDF, setIsDownloadingPDF] = useState(false)

  const handleDownloadHTML = async () => {
    if (isDownloadingHTML || isDownloadingPDF || disabled) return

    setIsDownloadingHTML(true)
    try {
      await onDownloadHTML()
    } catch (error) {
      console.error('HTML download failed:', error)
    } finally {
      setIsDownloadingHTML(false)
    }
  }

  const handleDownloadPDF = async () => {
    if (isDownloadingHTML || isDownloadingPDF || disabled) return

    setIsDownloadingPDF(true)
    try {
      await onDownloadPDF()
    } catch (error) {
      console.error('PDF download failed:', error)
    } finally {
      setIsDownloadingPDF(false)
    }
  }

  const isDownloading = isDownloadingHTML || isDownloadingPDF

  return (
    <div className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            disabled={disabled || isDownloading}
            variant="outline"
            size="sm"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isDownloadingHTML ? 'Downloading HTML...' : 'Downloading PDF...'}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download Report
                <ChevronDown className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            onClick={handleDownloadHTML}
            disabled={disabled || isDownloading}
          >
            <FileText className="w-4 h-4 mr-2" />
            Download as HTML
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={handleDownloadPDF}
            disabled={disabled || isDownloading}
          >
            <Download className="w-4 h-4 mr-2" />
            Download as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
} 