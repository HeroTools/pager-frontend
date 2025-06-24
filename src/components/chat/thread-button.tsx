import { FC, useMemo } from "react";
import { Message } from "@/types/chat";
import { MemberWithUser } from "@/features/members";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronRight } from "lucide-react";
import { useUIStore } from "@/store/ui-store";
import { formatDistanceToNow } from "date-fns";
import getThreadMembers from "@/lib/helpers/get-thread-members";

const ThreadButton: FC<{ message: Message; members: MemberWithUser[] }> = ({
  message,
  members,
}) => {
  const threadMembers = useMemo(
    () => getThreadMembers(message.threadParticipants!, members),
    [message.threadParticipants, members]
  );

  const { setThreadOpen } = useUIStore();

  return (
    <button
      onClick={() => setThreadOpen(message)}
      className="w-full max-w-xl cursor-pointer mt-2 inline-flex items-center gap-2 px-2 py-1 text-xs font-medium text-brand-blue rounded hover:bg-chat hover:border-border-default transition-colors group"
    >
      <div className="flex gap-1">
        {threadMembers.map((member) => (
          <Avatar
            key={member.id}
            className="w-5 h-5 ring-2 ring-card-foreground"
          >
            <AvatarImage src={member.user.image} />
            <AvatarFallback className="text-sm">
              {member.user.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>

      <span className="font-medium">
        {message.threadCount} {message.threadCount === 1 ? "reply" : "replies"}
      </span>

      <span className="text-text-subtle group-hover:hidden transition-all">
        Last reply{" "}
        {formatDistanceToNow(new Date(message.threadLastReplyAt!), {
          addSuffix: true,
        })}
      </span>

      <span className="hidden group-hover:inline-flex items-center justify-between text-text-subtle gap-1 transition-all flex-1">
        View thread <ChevronRight className="w-3 h-3" />
      </span>
    </button>
  );
};

export default ThreadButton;
