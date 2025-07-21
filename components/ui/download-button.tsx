"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Download, FileText, Loader2 } from "lucide-react"

interface DownloadButtonProps {
  onDownload: () => Promise<void>
  disabled?: boolean
  className?: string
}

export function DownloadButton({ onDownload, disabled = false, className = "" }: DownloadButtonProps) {
  const [isDownloading, setIsDownloading] = useState(false)

  const handleDownload = async () => {
    if (isDownloading || disabled) return

    setIsDownloading(true)
    try {
      await onDownload()
    } catch (error) {
      console.error('Download failed:', error)
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <Button
      onClick={handleDownload}
      disabled={disabled || isDownloading}
      variant="outline"
      size="sm"
      className={className}
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download Report
        </>
      )}
    </Button>
  )
} 