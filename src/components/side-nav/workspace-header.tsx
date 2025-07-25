import { ChevronDown, Settings, SquarePen } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useConversationCreateStore } from '@/features/conversations/store/conversation-create-store';
import type { WorkspaceEntity } from '@/features/workspaces/types';
import { InviteModal } from './invite-modal';

interface WorkspaceHeaderProps {
  workspace: WorkspaceEntity;
  isAdmin: boolean;
}

export const WorkspaceHeader = ({ workspace, isAdmin }: WorkspaceHeaderProps) => {
  const [inviteOpen, setInviteOpen] = useState(false);
  const router = useRouter();

  const { startConversationCreation } = useConversationCreateStore();

  const handleSettingsClick = () => {
    router.push(`/${workspace.id}/settings`);
  };

  return (
    <>
      <InviteModal open={inviteOpen} setOpen={setInviteOpen} name={workspace.name} />
      <div className="flex items-center justify-between px-2 h-12 gap-1 border-b">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="transparent"
              className="font-semibold text-lg w-auto p-2 overflow-hidden cursor-pointer hover:bg-content-area"
              size="sm"
            >
              <span className="truncate text-foreground">{workspace.name}</span>
              <ChevronDown className="size-4 ml-1 shrink-0 fill-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-64">
            <DropdownMenuItem className="cursor-pointer capitalize">
              <div className="size-9 relative overflow-hidden bg-primary text-primary-foreground font-semibold text-xl rounded-lg flex items-center justify-center mr-2">
                {workspace.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start">
                <p className="font-bold">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">Active workspace</p>
              </div>
            </DropdownMenuItem>
            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => setInviteOpen(true)}
                >
                  Invite people to {workspace.name}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer py-2" onClick={handleSettingsClick}>
                  <Settings className="size-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-1">
          <Button variant="transparent" className="hover:bg-content-area" size="iconSm" onClick={startConversationCreation}>
            <SquarePen className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
