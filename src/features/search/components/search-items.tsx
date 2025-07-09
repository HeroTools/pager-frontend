import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChannelEntity } from '@/features/channels';
import { MemberWithUser } from '@/features/members';
import { SearchResult } from '@/features/search/types';
import { Hash, Loader2 } from 'lucide-react';

export const ChannelItem = ({
  channel,
  onClick,
}: {
  channel: ChannelEntity;
  onClick: () => void;
}) => (
  <Button
    variant="ghost"
    className="flex items-center gap-2 p-2 rounded hover:bg-accent w-full text-left cursor-pointer justify-start"
    onClick={onClick}
  >
    <Hash className="size-4" />
    <span>{channel.name}</span>
  </Button>
);

export const MemberItem = ({
  member,
  onClick,
  isCreating,
}: {
  member: MemberWithUser;
  onClick: () => void;
  isCreating: boolean;
}) => (
  <Button
    variant="ghost"
    className="flex items-center gap-2 p-2 rounded hover:bg-accent w-full text-left cursor-pointer justify-start"
    onClick={onClick}
    disabled={isCreating}
  >
    <Avatar className="size-5">
      <AvatarImage src={member.user.image} alt={member.user.name} />
      <AvatarFallback>{member.user.name.charAt(0).toUpperCase()}</AvatarFallback>
    </Avatar>
    <span>{member.user.name}</span>
    {isCreating && <Loader2 className="size-4 animate-spin ml-auto" />}
  </Button>
);

export const MessageItem = ({ result, onClick }: { result: SearchResult; onClick: () => void }) => (
  <button
    className="flex items-start gap-3 p-2 rounded hover:bg-accent w-full text-left cursor-pointer"
    onClick={onClick}
  >
    <Avatar className="size-6 mt-0.5">
      <AvatarImage src={result.authorImage || ''} alt={result.authorName} />
      <AvatarFallback className="text-xs">
        {result.authorName?.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-medium text-sm truncate">{result.authorName}</span>
        <span className="truncate text-xs text-muted-foreground">{result.channelName || 'DM'}</span>
      </div>
      <p className="text-sm line-clamp-2 leading-relaxed">{result.content}</p>
      {result.isThread && (
        <Badge variant="secondary" className="mt-1 text-xs">
          Thread
        </Badge>
      )}
    </div>
  </button>
);
