import Image from 'next/image';
import React from 'react';

import { useTypingIndicator } from '@/hooks/use-typing-indicator';

interface TypingIndicatorProps {
  channelId?: string;
  conversationId?: string;
  currentUserId: string;
  getUserName: (userId: string) => string;
  getUserAvatar?: (userId: string) => string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  channelId,
  conversationId,
  currentUserId,
  getUserName,
  getUserAvatar,
}) => {
  const { typingUsers, isAnyoneTyping } = useTypingIndicator({
    channelId,
    conversationId,
    currentUserId,
  });

  if (!isAnyoneTyping) return null;

  const getText = () => {
    const nameOfUserOne = getUserName(typingUsers[0].user_id);
    const count = typingUsers.length;
    if (count === 1) return `${nameOfUserOne} is typing...`;
    if (count === 2)
      return `${nameOfUserOne} and ${getUserName(typingUsers[1].user_id)} are typing...`;
    return `${nameOfUserOne} and ${count - 1} others are typing...`;
  };

  const renderUserAvatars = () => {
    if (typingUsers.length === 0) return null;

    return (
      <div className="flex -space-x-1.5">
        {typingUsers.slice(0, 2).map((user, index) => {
          const avatarUrl = getUserAvatar?.(user.user_id);
          const nameOfUser = getUserName(user.user_id);
          return (
            <div
              key={user.user_id}
              className="relative w-5 h-5 rounded-md border border-white/20 overflow-hidden bg-foreground/80 backdrop-blur-sm flex items-center justify-center text-background text-xs font-medium"
              style={{ zIndex: 10 - index }}
            >
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt={nameOfUser}
                  width={20}
                  height={20}
                  className="w-full h-full object-cover"
                />
              ) : (
                nameOfUser.charAt(0).toUpperCase()
              )}
            </div>
          );
        })}
        {typingUsers.length > 2 && (
          <div className="w-5 h-5 rounded-full border border-white/20 bg-foreground/60 backdrop-blur-sm flex items-center justify-center text-xs font-medium text-background">
            +{typingUsers.length - 2}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="mx-4 mb-2 animate-in fade-in-0 slide-in-from-bottom-2 duration-300">
      <div className="glass-typing-indicator backdrop-blur-lg bg-foreground/5 border border-foreground/10 rounded-2xl px-4 py-3 shadow-2xl shadow-black/20">
        <div className="flex items-center gap-3">
          {renderUserAvatars()}
          <div className="flex items-center gap-1 -mb-0.5">
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 bg-foreground/60 rounded-full animate-bounce [animation-delay:300ms]" />
          </div>
          <span className="text-sm text-foreground/80 font-medium flex-1">{getText()}</span>
        </div>
      </div>
    </div>
  );
};
