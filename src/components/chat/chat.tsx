import { type FC, useCallback, useEffect, useRef, useState } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import type { CurrentUser } from '@/features/auth';
import type { ChannelMember } from '@/features/channels';
import type { UploadedAttachment } from '@/features/file-upload';
import { useParamIds } from '@/hooks/use-param-ids';
import type { Channel, Message } from '@/types/chat';
import dynamic from 'next/dynamic';
import { ChatHeader } from './header';
import { ChatMessageList } from './message-list';
import { TypingIndicator } from './typing-indicator';

interface ChatProps {
  channel: Channel;
  messages: Message[];
  currentUser: CurrentUser;
  chatType?: 'conversation' | 'channel';
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
  members?: ChannelMember[];
  highlightMessageId?: string | null;
}

const Editor = dynamic(() => import('@/components/editor/editor'), {
  ssr: false,
  loading: () => (
    <div className="flex flex-col border border-border-default rounded-md overflow-hidden">
      <div className="h-[194px] p-4">
        <Skeleton className="h-full w-full rounded-md" />
      </div>
      <div className="flex px-2 pb-2 gap-2 border-t">
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-8 rounded" />
        <Skeleton className="h-8 w-20 rounded ml-auto" />
      </div>
    </div>
  ),
});

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
}) => {
  const { workspaceId } = useParamIds();
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(true);

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

  useEffect(() => {
    if (shouldScrollToBottom) {
      scrollToBottom();
    }
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  useEffect(() => {
    if (!shouldScrollToBottom) {
      return;
    }
    const c = messagesContainerRef.current;
    if (!c || typeof ResizeObserver === 'undefined') {
      return;
    }

    const ro = new ResizeObserver(() => {
      scrollToBottom('auto');
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, [messages, shouldScrollToBottom, scrollToBottom]);

  useEffect(() => {
    if (!shouldScrollToBottom) {
      return;
    }
    const c = messagesContainerRef.current;
    if (!c) {
      return;
    }

    const imgs = Array.from(c.querySelectorAll('img'));

    const onImgLoad = () => {
      c.scrollTo({ top: c.scrollHeight, behavior: 'auto' });
    };

    imgs.forEach((img) => {
      if (!img.complete) {
        img.addEventListener('load', onImgLoad);
      }
    });

    return () => {
      imgs.forEach((img) => img.removeEventListener('load', onImgLoad));
    };
  }, [messages, shouldScrollToBottom]);

  const handleScroll = useCallback(() => {
    if (!messagesContainerRef.current) {
      return;
    }
    const c = messagesContainerRef.current!;

    if (c.scrollTop < 100 && hasMoreMessages && !isLoadingMore) {
      const prevH = c.scrollHeight;
      setShouldScrollToBottom(false);
      onLoadMore();
      setTimeout(() => {
        c.scrollTop = c.scrollHeight - prevH;
      }, 100);
    }
    setShouldScrollToBottom(c.scrollTop + c.clientHeight >= c.scrollHeight - 100);
  }, [hasMoreMessages, isLoadingMore, onLoadMore]);

  const getUserName = (userId: string) => {
    if (!members) {
      return 'Unknown';
    }

    const member = members.find((member) => {
      if ('user_id' in member) {
        return member.user_id === userId || member.user.id === userId;
      }
    });

    if (!member) {
      return 'Unknown';
    }

    return member.user.name;
  };

  const getUserAvatar = (userId: string) => {
    if (!members) {
      return 'Unknown';
    }

    const member = members.find((member) => {
      if ('user_id' in member) {
        return member.user_id === userId || member.user.id === userId;
      }
    });

    if (!member) {
      return 'Unknown';
    }

    return member.user.image;
  };

  return (
    <div className="flex flex-col h-full">
      <ChatHeader
        channel={channel}
        members={chatType === 'channel' ? (members as ChannelMember[]) : []}
        chatType={chatType}
        conversationData={conversationData}
        currentUser={currentUser}
      />

      <ChatMessageList
        messages={messages}
        currentUser={currentUser}
        isLoading={isLoading}
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
        currentUserId={currentUser.id}
        getUserName={getUserName}
        getUserAvatar={getUserAvatar}
      />

      <div className="p-4 border-t border-border-subtle">
        <Editor
          variant="create"
          workspaceId={workspaceId}
          placeholder={`Message ${chatType === 'channel' ? '#' : ''}${channel.name}`}
          onSubmit={handleSendMessage}
          disabled={isLoading}
          maxFiles={10}
          maxFileSizeBytes={20 * 1024 * 1024}
          userId={currentUser.id}
          channelId={channel.id}
          conversationId={conversationData?.id}
        />
      </div>
    </div>
  );
};
