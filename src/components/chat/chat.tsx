import { FC, useCallback, useEffect, useRef, useState } from "react";
import { Message, User, Channel } from "@/types/chat";
import { ChatHeader } from "./header";
import { ChatMessageList } from "./message-list";
import Editor from "@/components/editor";
import { useParamIds } from "@/hooks/use-param-ids";

interface ChatProps {
  channel: Channel;
  messages: Message[];
  currentUser: User;
  chatType?: "conversation" | "channel";
  onLoadMore: () => void;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isLoading?: boolean;
  onSendMessage: (content: {
    body: string;
    image: File | null;
    attachmentIds: string[];
  }) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReplyToMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  onToggleChannelDetails?: () => void;
  typingUsers?: { id: string; name: string; avatar?: string }[];
  onInputChange?: (value: string) => void;
  onTypingSubmit?: () => void;
}

export const Chat: FC<ChatProps> = ({
  channel,
  messages,
  currentUser,
  chatType,
  isLoading = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReplyToMessage,
  onReactToMessage,
  onToggleChannelDetails,
  onLoadMore,
  hasMoreMessages,
  isLoadingMore,
  typingUsers,
  onInputChange,
  onTypingSubmit,
}) => {
  const { workspaceId } = useParamIds();
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

  const handleSendMessage = (content: {
    body: string;
    image: File | null;
    attachmentIds: string[];
  }) => {
    onSendMessage(content);
  };

  const handleEditMessage = (messageId: string) => {
    setEditingMessageId(messageId);
    onEditMessage?.(messageId);
  };

  console.log(channel);

  useEffect(() => {
    if (shouldScrollToBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, shouldScrollToBottom]);

  // Handle scroll for infinite loading
  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } =
      messagesContainerRef.current;

    // Check if scrolled to top (for loading older messages)
    if (scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      const previousScrollHeight = scrollHeight;
      setShouldScrollToBottom(false);

      onLoadMore();

      // Maintain scroll position after loading
      setTimeout(() => {
        if (messagesContainerRef.current) {
          const newScrollHeight = messagesContainerRef.current.scrollHeight;
          messagesContainerRef.current.scrollTop =
            newScrollHeight - previousScrollHeight;
        }
      }, 100);
    }

    // Check if user is near bottom (to enable auto-scroll for new messages)
    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    setShouldScrollToBottom(isNearBottom);
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

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

      <div className="p-4 border-t border-border-subtle">
        <Editor
          workspaceId={workspaceId}
          placeholder={`Message ${chatType === "conversation" && "#"}${
            channel.name
          }`}
          onSubmit={handleSendMessage}
          disabled={isLoading}
        />
      </div>
    </div>
  );
};
