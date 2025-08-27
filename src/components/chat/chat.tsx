import dynamic from 'next/dynamic';
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { CurrentUser } from '@/features/auth';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import type { UploadedAttachment } from '@/features/file-upload';
import { getUserAvatar, getUserName } from '@/features/messages/helpers';
import { useParamIds } from '@/hooks/use-param-ids';
import type { Channel, Message } from '@/types/chat';
import { ChatMember } from '../../features/members';
import { ChatHeader } from './header';
import { JoinChannelPrompt } from './join-channel-prompt';
import { ChatMessageList } from './message-list';
import { TypingIndicator } from './typing-indicator';

interface ChatProps {
  channel: Channel;
  messages: Message[];
  currentUser: CurrentUser;
  chatType?: 'conversation' | 'channel' | 'agent';
  conversationData?: any; // Original conversation data for conversations
  onLoadMore: () => void;
  hasMoreMessages: boolean;
  isLoadingMore: boolean;
  isLoading?: boolean;
  onSendMessage: (content: {
    body: string;
    image: File | null;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onReactToMessage?: (messageId: string, emoji: string) => void;
  typingUsers?: { id: string; name: string; avatar?: string }[];
  onInputChange?: (value: string) => void;
  onTypingSubmit?: () => void;
  members?: ChatMember[];
  highlightMessageId?: string | null;
  isDisabled?: boolean;
  isChannelMember?: boolean;
}

const Editor = dynamic(() => import('@/components/editor/editor'), {
  ssr: false,
  loading: () => (
    <div className="h-[120px] bg-background border border-border-default rounded-md animate-pulse" />
  ),
});

const getPlaceholderText = (chatType: string, channelName: string) => {
  switch (chatType) {
    case 'agent':
      return `Message ${channelName}`;
    case 'channel':
      return `Message #${channelName}`;
    case 'conversation':
    default:
      return `Message ${channelName}`;
  }
};

export const Chat: FC<ChatProps> = ({
  channel,
  messages,
  currentUser,
  chatType,
  conversationData,
  isLoading = false,
  onSendMessage,
  onEditMessage,
  onDeleteMessage,
  onReactToMessage,
  onLoadMore,
  hasMoreMessages,
  isLoadingMore,
  members,
  highlightMessageId,
  isDisabled,
  isChannelMember = true,
}) => {
  const { workspaceId } = useParamIds();
  const { getDraft } = useDraftsStore();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);
  const lastScrollTopRef = useRef<number>(0);
  const isLoadingMoreRef = useRef<boolean>(false);
  const [editorKey, setEditorKey] = useState(() => `editor-${Date.now()}`);

  // Check for drafts for each message
  const messagesWithDrafts = useMemo(() => {
    return messages.map((message) => {
      const draft = getDraft(workspaceId, channel.id, message.id);
      const hasDraft = draft !== undefined;

      return {
        ...message,
        hasDraft,
      };
    });
  }, [messages, workspaceId, channel.id, getDraft]);

  const handleSendMessage = (content: {
    body: string;
    image: File | null;
    attachments: UploadedAttachment[];
    plainText: string;
  }) => {
    onSendMessage(content);
  };

  const handleEditMessage = (messageId: string, newContent: string) => {
    onEditMessage?.(messageId, newContent);
  };

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const c = messagesContainerRef.current;
    if (c) {
      c.scrollTo({ top: c.scrollHeight, behavior });
    }
  }, []);

  // Auto-scroll to bottom for new messages only when user is near bottom
  useEffect(() => {
    if (shouldScrollToBottom && !isLoadingMore) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom, scrollToBottom, isLoadingMore]);

  useEffect(() => {
    if (!shouldScrollToBottom || isLoadingMore) {
      return;
    }
    const c = messagesContainerRef.current;
    if (!c || typeof ResizeObserver === 'undefined') {
      return;
    }

    const ro = new ResizeObserver(() => {
      if (shouldScrollToBottom && !isLoadingMore) {
        scrollToBottom('auto');
      }
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [messages, shouldScrollToBottom, scrollToBottom, isLoadingMore]);

  useEffect(() => {
    if (!shouldScrollToBottom || isLoadingMore) {
      return;
    }
    const c = messagesContainerRef.current;
    if (!c) {
      return;
    }

    const imgs = Array.from(c.querySelectorAll('img'));

    const onImgLoad = () => {
      if (shouldScrollToBottom && !isLoadingMore) {
        c.scrollTo({ top: c.scrollHeight, behavior: 'auto' });
      }
    };

    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', onImgLoad);
      }
    });

    return () => {
      imgs.forEach((img) => img.removeEventListener('load', onImgLoad));
    };
  }, [messages, shouldScrollToBottom, isLoadingMore]);

  const handleScroll = useCallback(() => {
    const c = messagesContainerRef.current;
    if (!c) return;

    const scrollTop = c.scrollTop;
    const scrollHeight = c.scrollHeight;
    const clientHeight = c.clientHeight;

    const isNearBottom = scrollTop + clientHeight >= scrollHeight - 100;
    setShouldScrollToBottom(isNearBottom);

    if (scrollTop < 200 && hasMoreMessages && !isLoadingMore && !isLoadingMoreRef.current) {
      isLoadingMoreRef.current = true;
      lastScrollTopRef.current = scrollTop;
      onLoadMore();
    }
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  useEffect(() => {
    if (!isLoadingMore) {
      isLoadingMoreRef.current = false;
    }
  }, [isLoadingMore]);

  return (
    <div className="flex flex-col h-full pb-[120px] md:pb-0">
      <ChatHeader
        channel={channel}
        members={chatType === 'channel' ? (members as ChatMember[]) : []}
        chatType={chatType}
        conversationData={conversationData}
        currentUser={currentUser}
      />

      <ChatMessageList
        messages={messagesWithDrafts}
        currentUser={currentUser}
        isLoading={isLoading}
        isLoadingMore={isLoadingMore}
        onEdit={handleEditMessage}
        onDelete={onDeleteMessage}
        onReaction={onReactToMessage}
        containerRef={messagesContainerRef}
        onScroll={handleScroll}
        highlightMessageId={highlightMessageId}
      />

      <TypingIndicator
        channelId={channel.id}
        conversationId={conversationData?.id}
        currentUserId={currentUser?.id}
        getUserName={(userId) => getUserName(userId, members)}
        getUserAvatar={(userId) => getUserAvatar(userId, members)}
      />

      {chatType === 'channel' && !isChannelMember ? (
        <div className="p-4 border-t">
          <JoinChannelPrompt channel={channel} />
        </div>
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-background md:relative md:p-4 md:border-t">
          <Editor
            key={editorKey}
            variant="create"
            workspaceId={workspaceId}
            placeholder={getPlaceholderText(chatType, channel.name)}
            onSubmit={handleSendMessage}
            disabled={isLoading || isDisabled}
            maxFiles={10}
            maxFileSizeBytes={20 * 1024 * 1024}
            userId={currentUser?.id}
            channelId={chatType === 'channel' ? channel.id : undefined}
            conversationId={chatType === 'conversation' ? channel.id : undefined}
            agentConversationId={chatType === 'agent' ? channel.id : undefined}
          />
        </div>
      )}
    </div>
  );
};
