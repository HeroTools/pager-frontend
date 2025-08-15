import { AlertTriangle, HashIcon, Lock, Pencil } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useAgents } from '@/features/agents/hooks/use-agents';
import { useCurrentUser } from '@/features/auth/hooks/use-current-user';
import { useGetUserChannels } from '@/features/channels/hooks/use-channels-mutations';
import { useCreateChannelModal } from '@/features/channels/store/use-create-channel-modal';
import { useConversations } from '@/features/conversations';
import { useConversationCreateStore } from '@/features/conversations/store/conversation-create-store';
import { useDraftsStore } from '@/features/drafts/store/use-drafts-store';
import { useChannelNotifications } from '@/features/notifications/hooks/use-channel-notifications';
import { useConversationNotifications } from '@/features/notifications/hooks/use-conversation-notifications';
import { useGetWorkspace } from '@/features/workspaces/hooks/use-workspaces';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/stores/ui-store';
import { ChannelType } from '@/types/chat';
import AgentItem from './agent-item';
import { ConversationItem } from './conversation-member';
import { InviteModal } from './invite-modal';
import { SidebarItem } from './sidebar-item';
import { WorkspaceHeader } from './workspace-header';
import { WorkspaceSection } from './workspace-section';

export const WorkspaceSidebar = () => {
  const router = useRouter();
  const { workspaceId, id: entityId, agentId } = useParamIds();

  const getWorkspace = useGetWorkspace(workspaceId);
  const getUserChannels = useGetUserChannels(workspaceId);
  const { conversations } = useConversations(workspaceId);
  const getWorkspaceAgents = useAgents(workspaceId);
  const { user: currentUser } = useCurrentUser(workspaceId);
  const { hasChannelUnread } = useChannelNotifications(workspaceId);
  const { getConversationUnreadCount } = useConversationNotifications(workspaceId);
  const { getWorkspaceDrafts } = useDraftsStore();
  const { setThreadOpen } = useUIStore();

  const [draftCount, setDraftCount] = useState(0);

  // prevent hydration mismatch
  useEffect(() => {
    setDraftCount(Object.keys(getWorkspaceDrafts(workspaceId)).length);
  }, [getWorkspaceDrafts, workspaceId]);

  const { startConversationCreation } = useConversationCreateStore();
  const setOpen = useCreateChannelModal((state) => state.setOpen);

  const [inviteOpen, setInviteOpen] = useState(false);

  if (getWorkspace.error) {
    return (
      <div className="flex flex-col gap-y-2 h-full items-center justify-center">
        <AlertTriangle className="size-5 text-muted-foreground" />
        <p className="text-muted-foreground text-sm">Workspace not found</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {getWorkspace.data ? (
        <WorkspaceHeader
          workspace={getWorkspace.data}
          isAdmin={getWorkspace.data?.user_role === 'admin'}
        />
      ) : (
        <div className="flex items-center justify-between p-3 md:px-4 md:h-[49px] gap-0.5 border-b">
          <Skeleton className="h-7 w-32" />
        </div>
      )}
      <div className="flex flex-col h-full overflow-y-auto pb-12 gap-y-2">
        <div className="hidden md:flex flex-col px-2 mt-3">
          <SidebarItem
            label="Drafts"
            icon={Pencil}
            id="drafts"
            variant={entityId === 'drafts' ? 'active' : 'default'}
            count={draftCount > 0 ? draftCount : undefined}
          />
        </div>
        <WorkspaceSection
          label="Channels"
          hint="New channel"
          onNew={getWorkspace.data?.user_role === 'admin' ? () => setOpen(true) : undefined}
        >
          {(getUserChannels.data || []).map((item: any) => (
            <SidebarItem
              key={item.id}
              label={item.name}
              icon={item.channel_type === ChannelType.PRIVATE ? Lock : HashIcon}
              id={item.id}
              variant={entityId === item.id ? 'active' : 'default'}
              hasUnread={hasChannelUnread(item.id)}
            />
          ))}
          {getUserChannels.data && (
            <div className="pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button className="w-full" variant="ghost">
                    + Add Channel
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setOpen(true)}>
                    Create a new channel
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setThreadOpen(null);
                      router.push(`/${workspaceId}/browse-channels`);
                    }}
                  >
                    Browse channels
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </WorkspaceSection>
        <WorkspaceSection
          label="Direct Messages"
          hint="New direct message"
          onNew={startConversationCreation}
        >
          {(conversations || []).map((conversation: any) => (
            <ConversationItem
              key={conversation.id}
              conversation={conversation}
              variant={entityId === conversation.id ? 'active' : 'default'}
              hasUnread={getConversationUnreadCount(conversation.id) > 0}
            />
          ))}
          {currentUser?.role === 'admin' && (
            <>
              <Button
                className="mt-2 w-full"
                variant="ghost"
                onClick={() => setInviteOpen(true)}
                disabled={false}
              >
                + Invite People
              </Button>
              <InviteModal
                open={inviteOpen}
                setOpen={setInviteOpen}
                name={getWorkspace.data?.name || ''}
              />
            </>
          )}
        </WorkspaceSection>
        <WorkspaceSection label="Agents" hint="New agent">
          {(getWorkspaceAgents.data || []).map((agent: any) => (
            <AgentItem
              key={agent.id}
              agent={agent}
              variant={agentId === agent.id ? 'active' : 'default'}
            />
          ))}
        </WorkspaceSection>
      </div>
    </div>
  );
};
