import React, { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, Download, ChevronLeft, ChevronRight, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Attachment } from "@/types/chat";
import { cn } from "@/lib/utils";

// Helper function for consistent filename handling
const getAttachmentFilename = (attachment: Attachment, fallback = "Untitled") => 
  (attachment as any).original_filename || fallback;

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  initialIndex?: number;
}

export const MediaViewerModal: React.FC<MediaViewerModalProps> = ({
  isOpen,
  onClose,
  attachments,
  initialIndex = 0,
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [showControls, setShowControls] = useState(false);

  const currentAttachment = attachments[currentIndex];
  const isImage = currentAttachment?.content_type?.startsWith("image/");
  const isVideo = currentAttachment?.content_type?.startsWith("video/");

  // Reset state when modal opens/closes or attachment changes
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [isOpen, initialIndex]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowLeft":
          goToPrevious();
          break;
        case "ArrowRight":
          goToNext();
          break;
        case "r":
        case "R":
          rotate();
          break;
        case "+":
        case "=":
          zoomIn();
          break;
        case "-":
          zoomOut();
          break;
        case "0":
          resetZoom();
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, currentIndex, attachments.length]);

  const goToPrevious = useCallback(() => {
    if (attachments.length > 1) {
      setCurrentIndex((prev) => (prev > 0 ? prev - 1 : attachments.length - 1));
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [attachments.length]);

  const goToNext = useCallback(() => {
    if (attachments.length > 1) {
      setCurrentIndex((prev) => (prev < attachments.length - 1 ? prev + 1 : 0));
      setZoom(1);
      setRotation(0);
      setIsLoading(true);
      setHasError(false);
    }
  }, [attachments.length]);

  const zoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 3));
  const zoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
  const resetZoom = () => setZoom(1);
  const rotate = () => setRotation((prev) => (prev + 90) % 360);

  const handleDownload = () => {
    if (currentAttachment) {
      const link = document.createElement("a");
      link.href = currentAttachment.public_url;
      link.download = getAttachmentFilename(currentAttachment, "download");
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (!currentAttachment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-none w-[90vw] h-[90vh] p-0 bg-background/95 backdrop-blur-sm border-border rounded-lg"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div 
          className="relative w-full h-full flex items-center justify-center overflow-hidden"
          onMouseEnter={() => setShowControls(true)}
          onMouseLeave={() => setShowControls(false)}
        >

          {/* Navigation arrows */}
          {attachments.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-card/80 hover:bg-card border-border text-foreground transition-opacity duration-200",
                  showControls ? "opacity-100" : "opacity-0"
                )}
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-card/80 hover:bg-card border-border text-foreground transition-opacity duration-200",
                  showControls ? "opacity-100" : "opacity-0"
                )}
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Media controls */}
          {isImage && (
            <div className={cn(
              "absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card/80 border border-border rounded-lg p-2 transition-opacity duration-200",
              showControls ? "opacity-100" : "opacity-0"
            )}>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={zoomOut}
                disabled={zoom <= 0.25}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-foreground text-sm px-2 min-w-[60px] text-center">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={zoomIn}
                disabled={zoom >= 3}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={rotate}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* File info */}
          <div className={cn(
            "absolute top-4 left-4 z-50 bg-card/80 border border-border rounded-lg p-3 text-foreground transition-opacity duration-200",
            showControls ? "opacity-100" : "opacity-0"
          )}>
            <p className="text-sm font-medium">
              {getAttachmentFilename(currentAttachment)}
            </p>
            {attachments.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} of {attachments.length}
              </p>
            )}
          </div>

          {/* Media content */}
          <div className="relative flex items-center justify-center" style={{ width: 'calc(100% - 1rem)', height: 'calc(100% - 1rem)' }}>
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {hasError ? (
              <div className="text-foreground text-center">
                <p className="text-lg font-medium">Failed to load media</p>
                <p className="text-sm text-muted-foreground mt-1">The file might be corrupted or unavailable</p>
              </div>
            ) : isImage ? (
              <img
                src={currentAttachment.public_url}
                alt={getAttachmentFilename(currentAttachment, "Image")}
                className={cn(
                  "max-w-full max-h-full object-contain transition-all duration-200",
                  !isLoading && "cursor-grab active:cursor-grabbing"
                )}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  opacity: isLoading ? 0 : 1
                }}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
                draggable={false}
              />
            ) : isVideo ? (
              <video
                src={currentAttachment.public_url}
                className="max-w-full max-h-full object-contain"
                controls
                autoPlay
                onLoadedData={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <div className="text-foreground text-center">
                <p className="text-lg font-medium">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentAttachment.original_filename || "Unknown file"}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-border hover:bg-accent hover:text-accent-foreground"
                  onClick={handleDownload}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};