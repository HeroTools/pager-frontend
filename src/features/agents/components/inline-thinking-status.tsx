import { cn } from '@/lib/utils';
import { Brain, CheckCircle, Cog, Loader, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ThinkingEvent } from '../types';

interface InlineThinkingStatusProps {
  isStreaming: boolean;
  thinking?: ThinkingEvent | null;
  className?: string;
}

const InlineThinkingStatus = ({ isStreaming, thinking, className }: InlineThinkingStatusProps) => {
  const [currentStatus, setCurrentStatus] = useState<ThinkingEvent | null>(null);
  const [showStatus, setShowStatus] = useState(false);

  // Update current status when thinking changes
  useEffect(() => {
    if (thinking) {
      setCurrentStatus(thinking);
      setShowStatus(true);
    }
  }, [thinking]);

  // Hide status after streaming completes
  useEffect(() => {
    if (!isStreaming && currentStatus?.status === 'complete') {
      const timer = setTimeout(() => {
        setShowStatus(false);
        setCurrentStatus(null);
      }, 2000);

      return () => clearTimeout(timer);
    } else if (!isStreaming) {
      // If streaming stops without a complete status, hide after a short delay
      const timer = setTimeout(() => {
        setShowStatus(false);
        setCurrentStatus(null);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isStreaming, currentStatus?.status]);

  if (!showStatus || !currentStatus) {
    return null;
  }

  const getIcon = () => {
    switch (currentStatus.status) {
      case 'thinking':
        return <Brain className="w-3 h-3 text-accent-info animate-pulse" />;
      case 'using_tools':
        return <Wrench className="w-3 h-3 text-accent-warning animate-spin" />;
      case 'processing':
        return <Cog className="w-3 h-3 text-accent-primary animate-spin" />;
      case 'generating':
        return <Loader className="w-3 h-3 text-accent-success animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-accent-success" />;
      default:
        return <Brain className="w-3 h-3 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (currentStatus.status) {
      case 'thinking':
        return 'text-accent-info';
      case 'using_tools':
        return 'text-accent-warning';
      case 'processing':
        return 'text-accent-primary';
      case 'generating':
        return 'text-accent-success';
      case 'complete':
        return 'text-accent-success';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-2 mt-1 text-xs transition-all duration-300 animate-in slide-in-from-top-1',
        getStatusColor(),
        className,
      )}
    >
      {getIcon()}
      <span className="italic">{currentStatus.message}</span>

      {/* Show processing time for completed status */}
      {currentStatus.status === 'complete' && currentStatus.processingTime && (
        <span className="text-muted-foreground">
          • {(currentStatus.processingTime / 1000).toFixed(1)}s
        </span>
      )}

      {/* Show tool count if tools were used */}
      {currentStatus.status === 'complete' &&
        currentStatus.toolCallsUsed &&
        currentStatus.toolCallsUsed > 0 && (
          <span className="text-muted-foreground">
            • looked up {currentStatus.toolCallsUsed} thing
            {currentStatus.toolCallsUsed > 1 ? 's' : ''}
          </span>
        )}
    </div>
  );
};

export default InlineThinkingStatus;
