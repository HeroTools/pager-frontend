import type { FC } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Reaction } from '@/features/reactions/types';

interface MessageReactionsProps {
  reactions: Reaction[];
  onReaction: (emoji: string) => void;
  currentUserId: string;
}

export const MessageReactions: FC<MessageReactionsProps> = ({
  reactions,
  onReaction,
  currentUserId,
}) => {
  if (!reactions || reactions.length === 0) {
    return null;
  }

  const ReactionTooltipContent: FC<{
    reaction: Reaction;
    currentUserId: string;
  }> = ({ reaction, currentUserId }) => {
    const sortedUsers = [...reaction.users].sort((a, b) => {
      if (a.id === currentUserId) {
        return -1;
      }
      if (b.id === currentUserId) {
        return 1;
      }
      return a.name.localeCompare(b.name);
    });

    const maxVisible = 25;
    const visibleUsers = sortedUsers.slice(0, maxVisible);
    const remainingCount = reaction.count - maxVisible;

    const formatUserList = (): string => {
      if (visibleUsers.length === 1) {
        return visibleUsers[0].id === currentUserId
          ? 'You (click to remove)'
          : visibleUsers[0].name;
      }

      if (visibleUsers.length === 2) {
        const names = visibleUsers.map((user) => (user.id === currentUserId ? 'You' : user.name));
        return `${names[0]} and ${names[1]}`;
      }

      const names = visibleUsers.map((user) =>
        user.id === currentUserId ? 'You (click to remove)' : user.name,
      );

      if (remainingCount > 0) {
        return `${names.slice(0, 2).join(', ')} and ${names.length - 2 + remainingCount} others`;
      }

      return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    };

    return (
      <div className="flex flex-col items-center gap-2 p-3 min-w-0 max-w-48">
        <div className="text-4xl leading-none mb-1">{reaction.value}</div>

        <div className="text-center">
          <div className="text-xs font-medium text-foreground mb-1">
            {formatUserList()}{' '}
            <span className="text-xs text-muted-foreground">reacted with {reaction.value}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex flex-wrap gap-1 mt-1">
        {reactions.map((reaction) => {
          const hasUserReacted = reaction.users.some((user) => user.id === currentUserId);

          return (
            <Tooltip key={`${reaction.id}-tooltip${currentUserId}`}>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    'h-6 px-2 py-0 text-xs rounded-full border transition-all duration-200',
                    hasUserReacted
                      ? [
                          'bg-interactive-active border-interactive-active-border text-interactive-active-text',
                          'hover:bg-interactive-active-hover hover:border-interactive-active-border-hover',
                        ]
                      : [
                          'bg-interactive-inactive border-interactive-inactive-border text-interactive-inactive-text',
                          'hover:bg-interactive-inactive-hover hover:border-interactive-inactive-border-hover hover:text-interactive-inactive-text-hover',
                        ],
                  )}
                  onClick={() => onReaction(reaction.value)}
                >
                  <span className="mr-1">{reaction.value}</span>
                  <span className="font-medium">{reaction.count}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className={cn('p-0 border shadow-lg max-w-none', 'bg-popover border-border')}
                sideOffset={8}
              >
                <ReactionTooltipContent reaction={reaction} currentUserId={currentUserId} />
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
