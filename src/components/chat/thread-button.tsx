import type { FC } from 'react';
import { useMemo } from 'react';
import type { Message } from '@/types/chat';
import type { MemberWithUser } from '@/features/members';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChevronRight } from 'lucide-react';
import { useUIStore } from '@/store/ui-store';
import { formatDistanceToNow } from 'date-fns';
import getThreadMembers from '@/lib/helpers/get-thread-members';
import { cn } from '@/lib/utils';

const ThreadButton: FC<{ message: Message; members: MemberWithUser[] }> = ({
  message,
  members,
}) => {
  const threadMembers = useMemo(
    () => getThreadMembers(message.threadParticipants!, members),
    [message.threadParticipants, members],
  );
  const { setThreadOpen, setProfilePanelOpen } = useUIStore();

  if (!message.threadCount || message.threadCount === 0) {
    return null;
  }

  const displayedMembers = threadMembers.slice(0, 3);

  return (
    <button
      onClick={() => setThreadOpen(message)}
      className={cn(
        'w-full max-w-xl cursor-pointer mt-2 inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-brand-blue rounded hover:bg-chat hover:border-border-default transition-colors',
        '[&:hover>.last-reply]:hidden',
        '[&:hover>.view-thread]:inline-flex',
      )}
    >
      <div className="flex gap-1">
        {displayedMembers.map((member) => (
          <Avatar
            key={member.id}
            className="w-5 h-5 ring-2 ring-card-foreground cursor-pointer hover:opacity-80 transition-opacity"
            onClick={(e) => {
              e.stopPropagation(); // Prevent thread from opening
              setProfilePanelOpen(member.id);
            }}
          >
            <AvatarImage src={member.user.image} />
            <AvatarFallback className="text-sm">
              {member.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      <span className="font-medium">
        {message.threadCount} {message.threadCount === 1 ? 'reply' : 'replies'}
      </span>

      <span className="last-reply text-text-subtle transition-all">
        Last reply{' '}
        {formatDistanceToNow(new Date(message.threadLastReplyAt!), {
          addSuffix: true,
        })}
      </span>

      <span className="view-thread hidden items-center justify-between text-text-subtle gap-1 transition-all flex-1">
        View thread <ChevronRight className="w-3 h-3" />
      </span>
    </button>
  );
};

export default ThreadButton;
