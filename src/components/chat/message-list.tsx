import React, { useEffect, useRef } from "react";
import { Message, User } from "@/types/chat";
import { ChatMessage } from "./message";
import { isSameDay } from "date-fns";

interface ChatMessageListProps {
  messages: Message[];
  currentUser: User;
  isLoading?: boolean;
  onEdit?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (messageId: string) => void;
  onReaction?: (messageId: string, emoji: string) => void;
}

export const ChatMessageList: React.FC<ChatMessageListProps> = ({
  messages,
  currentUser,
  isLoading = false,
  onEdit,
  onDelete,
  onReply,
  onReaction,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        <div className="text-gray-500">Loading messages...</div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="pb-4">
        {messages.map((message, index) => {
          const showAvatar = shouldShowAvatar(message, index);
          const showDateDivider = shouldShowDateDivider(message, index);

          return (
            <React.Fragment key={message.id}>
              {showDateDivider && (
                <div className="flex items-center my-4 px-4">
                  <div className="flex-1 border-t border-border-subtle" />
                  <div className="mx-4 text-xs text-gray-500 px-2">
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
            </React.Fragment>
          );
        })}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};
