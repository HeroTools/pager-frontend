import { cn } from '@/lib/utils';
import { Brain, CheckCircle, Cog, Loader, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ThinkingEvent {
  status: 'thinking' | 'generating' | 'using_tools' | 'processing' | 'complete';
  message: string;
  toolCallsUsed?: number;
  processingTime?: number;
}

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
        return <Brain className="w-3 h-3 text-blue-500 animate-pulse" />;
      case 'using_tools':
        return <Wrench className="w-3 h-3 text-orange-500 animate-spin" />;
      case 'processing':
        return <Cog className="w-3 h-3 text-purple-500 animate-spin" />;
      case 'generating':
        return <Loader className="w-3 h-3 text-green-500 animate-spin" />;
      case 'complete':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      default:
        return <Brain className="w-3 h-3 text-muted-foreground animate-pulse" />;
    }
  };

  const getStatusColor = () => {
    switch (currentStatus.status) {
      case 'thinking':
        return 'text-blue-600 dark:text-blue-400';
      case 'using_tools':
        return 'text-orange-600 dark:text-orange-400';
      case 'processing':
        return 'text-purple-600 dark:text-purple-400';
      case 'generating':
        return 'text-green-600 dark:text-green-400';
      case 'complete':
        return 'text-green-600 dark:text-green-400';
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
