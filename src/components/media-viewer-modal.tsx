import { FC, useState, useEffect, useCallback } from 'react';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  ExternalLink,
} from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Attachment } from '@/types/chat';
import { cn } from '@/lib/utils';

interface MediaViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  attachments: Attachment[];
  initialIndex?: number;
}

export const MediaViewerModal: FC<MediaViewerModalProps> = ({
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
  const isImage = currentAttachment?.contentType?.startsWith('image/');
  const isVideo = currentAttachment?.contentType?.startsWith('video/');

  // Document type detection
  const getDocumentType = (attachment: Attachment | undefined) => {
    if (!attachment) return null;

    const mimeType = attachment.contentType || '';
    const filename = attachment.originalFilename || '';
    const extension = filename.split('.').pop()?.toLowerCase();

    if (mimeType.includes('pdf') || extension === 'pdf') {
      return 'pdf';
    }
    if (mimeType.includes('document') || ['doc', 'docx'].includes(extension || '')) {
      return 'word';
    }
    if (mimeType.includes('spreadsheet') || ['xls', 'xlsx'].includes(extension || '')) {
      return 'excel';
    }
    if (mimeType.includes('presentation') || ['ppt', 'pptx'].includes(extension || '')) {
      return 'powerpoint';
    }
    return null;
  };

  const documentType = getDocumentType(currentAttachment);
  const isDocument = documentType !== null;

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

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          goToPrevious();
          break;
        case 'ArrowRight':
          goToNext();
          break;
        case 'r':
        case 'R':
          if (isImage) rotate();
          break;
        case '+':
        case '=':
          if (isImage) zoomIn();
          break;
        case '-':
          if (isImage) zoomOut();
          break;
        case '0':
          if (isImage) resetZoom();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, attachments.length, isImage]);

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
      const link = document.createElement('a');
      link.href = currentAttachment.publicUrl;
      link.download = currentAttachment.originalFilename || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const openInNewTab = () => {
    if (currentAttachment) {
      window.open(currentAttachment.publicUrl, '_blank');
    }
  };

  const getDocumentViewer = () => {
    if (!currentAttachment || !isDocument) return null;

    const viewerUrl = (() => {
      switch (documentType) {
        case 'pdf':
          return currentAttachment.publicUrl;
        case 'word':
        case 'excel':
        case 'powerpoint':
          // Use Microsoft Office Online viewer for Office documents
          return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
            currentAttachment.publicUrl,
          )}`;
        default:
          return null;
      }
    })();

    if (!viewerUrl) return null;

    if (documentType === 'pdf') {
      return (
        <iframe
          src={viewerUrl}
          className="w-full h-full border-0 rounded-lg"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      );
    }

    // For Office documents
    return (
      <iframe
        src={viewerUrl}
        className="w-full h-full border-0 rounded-lg bg-white"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    );
  };

  if (!currentAttachment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-none w-[90vw] h-[90vh] p-0 bg-background/95 backdrop-blur-sm border-border rounded-lg"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <DialogTitle className="sr-only">
          Media Viewer - {currentAttachment.originalFilename || 'Unknown Filename'}
        </DialogTitle>
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
                  'absolute left-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-card/80 hover:bg-card border-border text-foreground transition-opacity duration-200',
                  showControls ? 'opacity-100' : 'opacity-0',
                )}
                onClick={goToPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'absolute right-4 top-1/2 -translate-y-1/2 z-50 h-12 w-12 bg-card/80 hover:bg-card border-border text-foreground transition-opacity duration-200',
                  showControls ? 'opacity-100' : 'opacity-0',
                )}
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
            </>
          )}

          {/* Media controls for images */}
          {isImage && (
            <div
              className={cn(
                'absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card/80 border border-border rounded-lg p-2 transition-opacity duration-200',
                showControls ? 'opacity-100' : 'opacity-0',
              )}
            >
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

          {/* Document controls */}
          {isDocument && (
            <div
              className={cn(
                'absolute bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-card/80 border border-border rounded-lg p-2 transition-opacity duration-200',
                showControls ? 'opacity-100' : 'opacity-0',
              )}
            >
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={openInNewTab}
                title="Open in new tab"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-foreground hover:bg-accent hover:text-accent-foreground"
                onClick={handleDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* File info */}
          <div
            className={cn(
              'absolute top-4 left-4 z-50 bg-card/80 border border-border rounded-lg p-3 text-foreground transition-opacity duration-200',
              showControls ? 'opacity-100' : 'opacity-0',
            )}
          >
            <p className="text-sm font-medium">{currentAttachment.originalFilename}</p>
            {attachments.length > 1 && (
              <p className="text-xs text-muted-foreground">
                {currentIndex + 1} of {attachments.length}
              </p>
            )}
            {isDocument && (
              <p className="text-xs text-muted-foreground capitalize">{documentType} document</p>
            )}
          </div>

          {/* Media content */}
          <div
            className="relative flex items-center justify-center"
            style={{ width: 'calc(100% - 1rem)', height: 'calc(100% - 1rem)' }}
          >
            {isLoading && !hasError && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {hasError ? (
              <div className="text-foreground text-center">
                <p className="text-lg font-medium">
                  Failed to load {isDocument ? 'document' : 'media'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isDocument
                    ? 'The document might not be accessible or supported for preview'
                    : 'The file might be corrupted or unavailable'}
                </p>
                <div className="flex gap-2 mt-4 justify-center">
                  <Button
                    variant="outline"
                    className="border-border hover:bg-accent hover:text-accent-foreground"
                    onClick={openInNewTab}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open in new tab
                  </Button>
                  <Button
                    variant="outline"
                    className="border-border hover:bg-accent hover:text-accent-foreground"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            ) : isImage ? (
              <img
                src={currentAttachment.publicUrl}
                alt={currentAttachment.originalFilename || 'Unknown Filename'}
                className={cn(
                  'max-w-full max-h-full object-contain transition-all duration-200',
                  !isLoading && 'cursor-grab active:cursor-grabbing',
                )}
                style={{
                  transform: `scale(${zoom}) rotate(${rotation}deg)`,
                  opacity: isLoading ? 0 : 1,
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
                src={currentAttachment.publicUrl}
                className="max-w-full max-h-full object-contain"
                autoPlay
                controls
                onLoadedData={() => setIsLoading(false)}
                onError={() => {
                  setIsLoading(false);
                  setHasError(true);
                }}
              >
                Your browser does not support the video tag.
              </video>
            ) : isDocument ? (
              getDocumentViewer()
            ) : (
              <div className="text-foreground text-center">
                <p className="text-lg font-medium">Preview not available</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {currentAttachment.originalFilename || 'Unknown file'}
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
