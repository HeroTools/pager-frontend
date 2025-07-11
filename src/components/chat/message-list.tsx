import type { FC, RefObject, UIEvent } from 'react';
import { Fragment, useRef } from 'react';
import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';

import type { Message } from '@/types/chat';
import { ChatMessage } from './message';
import { useUIStore } from '@/store/ui-store';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/features/auth';
import { Skeleton } from '@/components/ui/skeleton';

interface ChatMessageListProps {
  messages: Message[];
  currentUser: CurrentUser;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  onEdit?: (messageId: string, newContent: string) => void;
  onDelete?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  containerRef?: RefObject<HTMLDivElement | null>;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
  highlightMessageId?: string | null;
}

const TIME_THRESHOLD = 5;

// Skeleton message component with consistent heights matching real messages
const MessageSkeleton: FC<{ isCompact?: boolean; index?: number }> = ({
  isCompact = false,
  index = 0,
}) => {
  // Create deterministic line patterns based on index
  const hasSecondLine = (index + 1) % 4 !== 0;
  const hasThirdLine = (index + 1) % 7 === 0;

  return (
    <div
      className={cn('px-4 py-1.5 transition-colors duration-100 ease-in-out', {
        'pt-3': !isCompact,
      })}
    >
      <div className="flex gap-3">
        {!isCompact ? (
          <div className="flex-shrink-0">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        ) : (
          <div className="w-9 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {!isCompact && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          )}
          <div className={cn('leading-relaxed space-y-1', !isCompact && 'mt-0')}>
            <Skeleton className="h-4 w-full max-w-md" />
            {hasSecondLine && <Skeleton className="h-4 w-3/4 max-w-sm" />}
            {hasThirdLine && <Skeleton className="h-4 w-1/2 max-w-xs" />}
          </div>
        </div>
      </div>
    </div>
  );
};

const SkeletonMessages: FC<{ count: number }> = ({ count }) => {
  const skeletons = [];

  for (let i = 0; i < count; i++) {
    const isCompact = i > 0 && i % 3 !== 0 && i % 5 !== 0;
    skeletons.push(<MessageSkeleton key={`skeleton-${i}`} isCompact={isCompact} index={i} />);
  }

  return <>{skeletons}</>;
};

export const ChatMessageList: FC<ChatMessageListProps> = ({
  messages,
  currentUser,
  isLoading = false,
  isLoadingMore = false,
  onEdit,
  onDelete,
  onReaction,
  containerRef,
  onScroll,
  highlightMessageId,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isEmojiPickerOpen } = useUIStore();

  const checkCompact = (message: Message, prev: Message) => {
    const currTime =
      typeof message.timestamp === 'string' ? parseISO(message.timestamp) : message.timestamp;
    const prevTime = typeof prev.timestamp === 'string' ? parseISO(prev.timestamp) : prev.timestamp;

    return (
      prev.authorId === message.authorId &&
      isSameDay(prevTime, currTime) &&
      differenceInMinutes(currTime, prevTime) < TIME_THRESHOLD
    );
  };

  const shouldShowDateDivider = (message: Message, index: number) => {
    if (index === 0) {
      return true;
    }
    const prevMessage = messages[index - 1];
    return !isSameDay(new Date(prevMessage.timestamp), new Date(message.timestamp));
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={cn(
        'flex-1 bg-chat',
        isEmojiPickerOpen() ? 'overflow-y-hidden' : 'overflow-y-auto',
      )}
      style={{
        scrollBehavior: 'auto',
        overscrollBehavior: 'none',
      }}
    >
      <div className="pb-4">
        {isLoadingMore && (
          <div className="border-b border-border-subtle/30 pb-4 mb-4">
            <SkeletonMessages count={8} />
          </div>
        )}

        {isLoading ? (
          // Initial loading state with full skeleton conversation
          <div className="px-4 py-4 space-y-2">
            <SkeletonMessages count={15} />
          </div>
        ) : (
          messages.map((message, index) => {
            const prev = messages[index - 1];
            let isCompact = false;

            if (prev) {
              isCompact = checkCompact(message, prev);
            }

            const showAvatar = !isCompact;
            const showDateDivider = shouldShowDateDivider(message, index);

            return (
              <Fragment key={message.id}>
                {showDateDivider && (
                  <div className="flex items-center my-4 px-4">
                    <div className="flex-1 border-t border-border-subtle" />
                    <div className="mx-4 text-xs text-muted-foreground bg-chat px-2">
                      {new Date(message.timestamp).toLocaleDateString()}
                    </div>
                    <div className="flex-1 border-t border-border-subtle" />
                  </div>
                )}
                <ChatMessage
                  message={message}
                  currentUser={currentUser}
                  showAvatar={showAvatar}
                  isCompact={isCompact}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReaction={onReaction || (() => {})}
                  isHighlighted={message.id === highlightMessageId}
                />
              </Fragment>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};
