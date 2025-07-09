'use client';

import { AlertTriangle } from 'lucide-react';

import ChannelChat from '@/components/chat/channel-chat';
import ConversationChat from '@/components/chat/conversation-chat';
import { useParamIds } from '@/hooks/use-param-ids';

const ChatPage = () => {
  const { type } = useParamIds();

  if (type === 'conversation') {
    return (
      <div className="flex flex-col h-full">
        <ConversationChat />
      </div>
    );
  } else if (type === 'channel') {
    return (
      <div className="flex flex-col h-full">
        <ChannelChat />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AlertTriangle className="size-5 text-muted-foreground" />
    </div>
  );
};

export default ChatPage;
