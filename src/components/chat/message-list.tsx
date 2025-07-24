import { differenceInMinutes, isSameDay, parseISO } from 'date-fns';
import { type FC, Fragment, type RefObject, type UIEvent, useRef } from 'react';

import type { CurrentUser } from '@/features/auth';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import type { Message } from '@/types/chat';
import { ChatMessage } from './message';
import { SkeletonMessages } from './skeleton-messages';

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
        'flex-1 bg-background',
        isEmojiPickerOpen() ? 'overflow-y-hidden' : 'overflow-y-auto',
      )}
      style={{
        scrollBehavior: 'auto',
        overscrollBehavior: 'none',
      }}
    >
      <div className="pb-4">
        {isLoadingMore && (
          <div className="border-b border/30 pb-4 mb-4">
            <SkeletonMessages count={8} />
          </div>
        )}

        {isLoading ? (
          // Initial loading state with full skeleton conversation
          <div className="px-2 py-2 space-y-2">
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
                  <div className="flex items-center my-2 px-2">
                    <div className="flex-1 border-t" />
                    <div className="mx-4 text-xs text-muted-foreground bg-background px-2">
                      {new Date(message.timestamp).toLocaleDateString()}
                    </div>
                    <div className="flex-1 border-t" />
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
