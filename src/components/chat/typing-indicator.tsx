import { useTypingIndicator } from '@/hooks/use-typing-indicator';

interface TypingIndicatorProps {
  channelId?: string;
  conversationId?: string;
  currentUserId: string;
  getUserName: (userId: string) => string;
}

export const TypingIndicator = ({
  channelId,
  conversationId,
  currentUserId,
  getUserName,
}: TypingIndicatorProps) => {
  const { typingUsers, isAnyoneTyping } = useTypingIndicator({
    channelId,
    conversationId,
    currentUserId,
  });

  if (!isAnyoneTyping) return null;

  const getTypingText = () => {
    const count = typingUsers.length;
    if (count === 1) {
      return `${getUserName(typingUsers[0].user_id)} is typing...`;
    } else if (count === 2) {
      return `${getUserName(typingUsers[0].user_id)} and ${getUserName(typingUsers[1].user_id)} are typing...`;
    } else {
      return `${getUserName(typingUsers[0].user_id)} and ${count - 1} others are typing...`;
    }
  };

  return (
    <div className="text-sm text-muted-foreground italic px-4 py-2 flex items-center gap-2">
      <div className="flex gap-1">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.1s]" />
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:0.2s]" />
      </div>
      <span>{getTypingText()}</span>
    </div>
  );
};
