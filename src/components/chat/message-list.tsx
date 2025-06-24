import React, { useEffect, useRef } from "react";
import { Message, User } from "@/types/chat";
import { ChatMessage } from "./message";
import { isSameDay } from "date-fns";
import { useUIStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";

interface ChatMessageListProps {
  messages: Message[];
  currentUser: User;
  isLoading?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
  onOpenMediaViewer?: (message: Message, attachmentIndex: number) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  currentUser,
  isLoading = false,
  onEdit,
  onDelete,
  onReply,
  onReaction,
  onOpenMediaViewer,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isEmojiPickerOpen } = useUIStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex-1 bg-chat",
        isEmojiPickerOpen() ? "overflow-y-hidden" : "overflow-y-auto"
      )}
    >
      <div className="pb-4">
        {messages.map((message, index) => {
          const showAvatar = shouldShowAvatar(message, index);
          const showDateDivider = shouldShowDateDivider(message, index);

          return (
            <React.Fragment key={message.id}>
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
                onOpenMediaViewer={onOpenMediaViewer}
              />
            </React.Fragment>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};
