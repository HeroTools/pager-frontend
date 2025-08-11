import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Loader, Mail, MessageCircle, X } from 'lucide-react';
import Link from 'next/link';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { useGetMembers } from '@/features/members';
import { useConversations } from '@/features/conversations/hooks/use-conversations';
import { useUserPresence } from '@/hooks/use-presence';

interface ProfileProps {
  memberId: string;
  onClose: () => void;
}

const STATUS_CONFIG = {
  online: { colorClass: 'bg-text-success', label: 'Active' },
  away: { colorClass: 'bg-text-warning', label: 'Away' },
  offline: { colorClass: 'bg-text-subtle', label: 'Offline' },
} as const;

export const Profile = ({ memberId, onClose }: ProfileProps) => {
  const workspaceId = useWorkspaceId() as string;
  const router = useRouter();
  const getMembers = useGetMembers(workspaceId);
  const { conversations = [], createConversation } = useConversations(workspaceId);
  const presence = useUserPresence(memberId);

  const member = useMemo(
    () => getMembers.data?.find((m) => m.id === memberId),
    [getMembers.data, memberId],
  );

  if (getMembers.isLoading) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex h-full items-center justify-center">
          <Loader className="size-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="h-full flex flex-col bg-background">
        <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-foreground">Profile</h2>
          <Button onClick={onClose} size="sm" variant="ghost">
            <X className="size-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <AlertTriangle className="size-6 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  const handleMessage = async () => {
    if (!member?.user?.id) {
      return;
    }

    // Try to find an existing 1-on-1 conversation with this user first
    const existingConversation = conversations.find((conversation) => {
      if (conversation.is_group_conversation) {
        return false;
      }
      return (
        conversation.members.length === 2 &&
        conversation.members.some((m) => m.workspace_member.id === member.id)
      );
    });

    if (existingConversation) {
      router.push(`/${workspaceId}/d-${existingConversation.id}`);
      onClose();
    } else {
      try {
        const newConversation = await createConversation.mutateAsync({
          participantMemberIds: [member.id],
        });

        router.push(`/${workspaceId}/d-${newConversation.id}`);
        onClose();
        toast.success('Conversation created');
      } catch (error) {
        toast.error('Failed to create conversation');
      }
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex justify-between items-center h-[49px] px-4 border-b border-border-subtle">
        <h2 className="text-lg font-semibold text-foreground">Profile</h2>
        <Button onClick={onClose} size="sm" variant="ghost">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex flex-col p-6 space-y-6">
        <div className="flex justify-center">
          <Avatar className="size-48 rounded-2xl" showPresence={false}>
            <AvatarImage
              src={member.user.image || undefined}
              className="rounded-2xl object-cover"
            />
            <AvatarFallback className="rounded-2xl text-4xl font-semibold">
              {member.user.name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{member.user.name}</h1>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`size-2 rounded-full ${STATUS_CONFIG[presence?.status || 'offline'].colorClass}`}
          ></div>
          <span className="text-sm text-muted-foreground">
            {STATUS_CONFIG[presence?.status || 'offline'].label}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleMessage}>
            <MessageCircle className="size-4" />
            Message
          </Button>
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-lg bg-muted flex items-center justify-center">
              <Mail className="size-4 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Email Address
              </p>
              <Link
                href={`mailto:${member.user.email}`}
                className="text-sm text-info hover:underline"
              >
                {member.user.email}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
