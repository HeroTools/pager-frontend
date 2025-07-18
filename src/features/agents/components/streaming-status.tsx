import { cn } from '@/lib/utils';
import { Brain, CheckCircle, Cog, Loader, Wrench } from 'lucide-react';
import { useEffect, useState } from 'react';

interface ToolCall {
  type: 'tool_call_start' | 'tool_call_end';
  toolName: string;
  arguments?: any;
  result?: any;
  callId: string;
  message: string;
  timestamp?: string;
}

interface AgentStep {
  type: 'step_start' | 'step_end';
  stepType: string;
  message: string;
  timestamp?: string;
}

interface ThinkingEvent {
  status: 'thinking' | 'generating' | 'complete';
  message: string;
  toolCallsUsed?: number;
  processingTime?: number;
  timestamp?: string;
}

interface StreamingStatusProps {
  isStreaming: boolean;
  thinking?: ThinkingEvent | null;
  toolCalls?: ToolCall[];
  steps?: AgentStep[];
  className?: string;
}

const StreamingStatus = ({
  isStreaming,
  thinking,
  toolCalls = [],
  steps = [],
  className,
}: StreamingStatusProps) => {
  const [visibleEvents, setVisibleEvents] = useState<
    Array<{
      id: string;
      type: 'thinking' | 'tool' | 'step';
      data: any;
      timestamp: number;
    }>
  >([]);

  // Add new events to the visible list
  useEffect(() => {
    if (thinking) {
      setVisibleEvents((prev) => [
        ...prev,
        {
          id: `thinking-${Date.now()}`,
          type: 'thinking',
          data: thinking,
          timestamp: Date.now(),
        },
      ]);
    }
  }, [thinking]);

  useEffect(() => {
    toolCalls.forEach((toolCall) => {
      setVisibleEvents((prev) => {
        // Avoid duplicates based on callId and type
        const exists = prev.some(
          (event) =>
            event.type === 'tool' &&
            event.data.callId === toolCall.callId &&
            event.data.type === toolCall.type,
        );

        if (!exists) {
          return [
            ...prev,
            {
              id: `tool-${toolCall.callId}-${toolCall.type}`,
              type: 'tool',
              data: { ...toolCall, timestamp: Date.now() },
              timestamp: Date.now(),
            },
          ];
        }
        return prev;
      });
    });
  }, [toolCalls]);

  useEffect(() => {
    steps.forEach((step) => {
      setVisibleEvents((prev) => [
        ...prev,
        {
          id: `step-${step.stepType}-${step.type}-${Date.now()}`,
          type: 'step',
          data: { ...step, timestamp: Date.now() },
          timestamp: Date.now(),
        },
      ]);
    });
  }, [steps]);

  // Clear events when streaming stops
  useEffect(() => {
    if (!isStreaming) {
      const timer = setTimeout(() => {
        setVisibleEvents([]);
      }, 3000); // Keep events visible for 3 seconds after streaming stops

      return () => clearTimeout(timer);
    }
  }, [isStreaming]);

  if (!isStreaming && visibleEvents.length === 0) {
    return null;
  }

  const getIcon = (event: (typeof visibleEvents)[0]) => {
    switch (event.type) {
      case 'thinking':
        const status = event.data.status;
        if (status === 'complete') {
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        return <Brain className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'tool':
        if (event.data.type === 'tool_call_end') {
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        return <Wrench className="w-4 h-4 text-orange-500 animate-spin" />;
      case 'step':
        if (event.data.type === 'step_end') {
          return <CheckCircle className="w-4 h-4 text-green-500" />;
        }
        return <Cog className="w-4 h-4 text-purple-500 animate-spin" />;
      default:
        return <Loader className="w-4 h-4 animate-spin" />;
    }
  };

  const getEventColor = (event: (typeof visibleEvents)[0]) => {
    switch (event.type) {
      case 'thinking':
        return event.data.status === 'complete'
          ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
          : 'border-blue-200 bg-blue-50 dark:bg-blue-950/20';
      case 'tool':
        return event.data.type === 'tool_call_end'
          ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
          : 'border-orange-200 bg-orange-50 dark:bg-orange-950/20';
      case 'step':
        return event.data.type === 'step_end'
          ? 'border-green-200 bg-green-50 dark:bg-green-950/20'
          : 'border-purple-200 bg-purple-50 dark:bg-purple-950/20';
      default:
        return 'border-border bg-muted';
    }
  };

  const formatEventMessage = (event: (typeof visibleEvents)[0]) => {
    switch (event.type) {
      case 'thinking':
        return event.data.message;
      case 'tool':
        const toolData = event.data;
        if (toolData.type === 'tool_call_start') {
          return `Using ${toolData.toolName}...`;
        } else {
          return `${toolData.toolName} completed`;
        }
      case 'step':
        return event.data.message;
      default:
        return 'Processing...';
    }
  };

  // Show only the most recent 5 events to avoid clutter
  const recentEvents = visibleEvents.slice(-5);

  return (
    <div
      className={cn('space-y-2 p-3 rounded-lg border border-border-subtle bg-muted/30', className)}
    >
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Brain className="w-4 h-4" />
        What I'm doing
      </div>

      <div className="space-y-1.5">
        {recentEvents.map((event, index) => (
          <div
            key={event.id}
            className={cn(
              'flex items-center gap-3 p-2 rounded-md border text-sm transition-all duration-200',
              getEventColor(event),
              'animate-in slide-in-from-left-2 duration-300',
            )}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {getIcon(event)}
            <span className="flex-1 text-foreground/90">{formatEventMessage(event)}</span>

            {/* Show additional details for tool calls */}
            {event.type === 'tool' &&
              event.data.type === 'tool_call_start' &&
              event.data.arguments && (
                <div className="text-xs text-muted-foreground">
                  {typeof event.data.arguments === 'string'
                    ? event.data.arguments.slice(0, 50) +
                      (event.data.arguments.length > 50 ? '...' : '')
                    : JSON.stringify(event.data.arguments).slice(0, 50) + '...'}
                </div>
              )}

            {/* Show processing time for completed thinking */}
            {event.type === 'thinking' &&
              event.data.status === 'complete' &&
              event.data.processingTime && (
                <div className="text-xs text-muted-foreground">
                  {(event.data.processingTime / 1000).toFixed(1)}s
                </div>
              )}
          </div>
        ))}

        {/* Current streaming indicator */}
        {isStreaming && (
          <div className="flex items-center gap-3 p-2 rounded-md border border-blue-200 bg-blue-50 dark:bg-blue-950/20 text-sm">
            <Loader className="w-4 h-4 text-blue-500 animate-spin" />
            <span className="flex-1 text-foreground/90">Writing my response...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StreamingStatus;
