import React, { useState } from "react";
import { Message, User, Channel } from "@/types/chat";
import { ChatHeader } from "./header";
import { ChatMessageList } from "./message-list";
import Editor from "@/components/editor";

interface ChatProps {
  channel: Channel;
  messages: Message[];
  currentUser: User;
  isLoading?: boolean;
  onSendMessage: (content: { body: string; image: File | null }) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onToggleChannelDetails?: () => void;
}

export const Chat: React.FC<ChatProps> = ({
  channel,
  messages,
  currentUser,
  isLoading = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage,
  onReactToMessage,
  onToggleChannelDetails,
}) => {
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  const handleSendMessage = (content: { body: string; image: File | null }) => {
    onSendMessage(content);
  };

  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
    onEditMessage?.(messageId);
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader channel={channel} onToggleDetails={onToggleChannelDetails} />

      <ChatMessageList
        messages={messages}
        currentUser={currentUser}
        isLoading={isLoading}
        onEdit={handleEditMessage}
        onDelete={onDeleteMessage}
        onReply={onReplyToMessage}
        onReaction={onReactToMessage}
      />

      <div className="p-4 border-t">
        <Editor
          placeholder={`Message #${channel.name}`}
          onSubmit={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
