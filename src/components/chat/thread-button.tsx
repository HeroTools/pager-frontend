import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { MemberWithUser } from '@/features/members';
import getThreadMembers from '@/lib/helpers/get-thread-members';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/stores/ui-store';
import type { Message } from '@/types/chat';
import { formatDistanceToNow } from 'date-fns';
import { ChevronRight, Pencil } from 'lucide-react';
import { type FC, useMemo } from 'react';

const ThreadButton: FC<{
  message: Message;
  members: MemberWithUser[];
  hasDraft?: boolean;
}> = ({ message, members, hasDraft = false }) => {
  const threadMembers = useMemo(
    () => getThreadMembers(message.threadParticipants || [], members),
    [message.threadParticipants, members],
  );
  const { setThreadOpen, setProfilePanelOpen } = useUIStore();

  // Show button if there are threads OR if there's a draft
  if (!message.threadCount && !hasDraft) {
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
      {message.threadCount > 0 && (
        <>
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
        </>
      )}

      {hasDraft && (
        <span className="flex items-center gap-1 font-medium">
          <Pencil className="w-3 h-3" />1 draft
        </span>
      )}

      {message.threadCount > 0 && message.threadLastReplyAt && (
        <span className="last-reply text-text-subtle transition-all">
          Last reply{' '}
          {formatDistanceToNow(new Date(message.threadLastReplyAt), {
            addSuffix: true,
          })}
        </span>
      )}

      <span className="view-thread hidden items-center justify-between text-text-subtle gap-1 transition-all flex-1">
        View thread <ChevronRight className="w-3 h-3" />
      </span>
    </button>
  );
};

export default ThreadButton;
