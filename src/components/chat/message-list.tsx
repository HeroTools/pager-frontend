import { FC, Fragment, RefObject, UIEvent, useRef } from "react";
import { isSameDay } from "date-fns";

import { Message } from "@/types/chat";
import { ChatMessage } from "./message";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { CurrentUser } from "@/features/auth";

interface ChatMessageListProps {
  messages: Message[];
  currentUser: CurrentUser;
  isLoading?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  containerRef?: RefObject<HTMLDivElement>;
  onScroll?: (e: UIEvent<HTMLDivElement>) => void;
}

export const ChatMessageList: FC<ChatMessageListProps> = ({
  messages,
  currentUser,
  isLoading = false,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  containerRef,
  onScroll,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isEmojiPickerOpen } = useUIStore();

  const shouldShowAvatar = (message: Message, index: number) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    return (
      prevMessage.authorId !== message.authorId ||
      !isSameDay(new Date(prevMessage.timestamp), new Date(message.timestamp))
    );
  };

  const shouldShowDateDivider = (message: Message, index: number) => {
    if (index === 0) return true;
    const prevMessage = messages[index - 1];
    return !isSameDay(
      new Date(prevMessage.timestamp),
      new Date(message.timestamp)
    );
  };

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      className={cn(
        "flex-1 bg-chat",
        isEmojiPickerOpen() ? "overflow-y-hidden" : "overflow-y-auto"
      )}
    >
      <div className="pb-4">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-muted-foreground">Loading messages...</div>
          </div>
        ) : (
          messages.map((message, index) => {
            const showAvatar = shouldShowAvatar(message, index);
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
                  isCompact={!showAvatar}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onReply={onReply}
                  onReaction={onReaction}
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
