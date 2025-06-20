import { ChevronDown, ListFilter, SquarePen } from "lucide-react";
import { useState } from "react";

import { InDevelopmentHint } from "@/components/in-development-hint";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InviteModal } from "./invite-modal";
import { PreferenceModal } from "./preference-modal";
import { useConversationCreateStore } from "@/features/conversations/store/conversation-create-store";
import { Workspace } from "@/types/database";

interface WorkspaceHeaderProps {
  workspace: Workspace;
  isAdmin: boolean;
}

export const WorkspaceHeader = ({
  workspace,
  isAdmin,
}: WorkspaceHeaderProps) => {
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const { startConversationCreation } = useConversationCreateStore();

  return (
    <>
      <InviteModal
        open={inviteOpen}
        setOpen={setInviteOpen}
        name={workspace.name}
        joinCode={workspace.join_code}
      />
      <PreferenceModal
        open={preferenceOpen}
        setOpen={setPreferenceOpen}
        initialVlaue={workspace.name}
      />
      <div className="flex items-center justify-between px-4 h-[49px] gap-0.5 border-b border-border-subtle">
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="transparent"
              className="font-semibold text-lg w-auto p-1.5 overflow-hidden cursor-pointer"
              size="sm"
            >
              <span className="truncate text-foreground">{workspace.name}</span>
              <ChevronDown className="size-4 ml-1 shrink-0 fill-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="bottom" className="w-64">
            <DropdownMenuItem className="cursor-pointer capitalize">
              <div className="size-9 relative overflow-hidden bg-primary text-primary-foreground font-semibold text-xl rounded-md flex items-center justify-center mr-2">
                {workspace.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex flex-col items-start">
                <p className="font-bold">{workspace.name}</p>
                <p className="text-xs text-muted-foreground">
                  Active workspace
                </p>
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
                <DropdownMenuItem
                  className="cursor-pointer py-2"
                  onClick={() => setPreferenceOpen(true)}
                >
                  Preference
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <div className="flex items-center gap-0.5">
          <InDevelopmentHint side="bottom">
            {/* <Hint label="Filter conversation" side="bottom"> */}
            <Button variant="transparent" size="iconSm" disabled>
              <ListFilter className="size-4" />
            </Button>
            {/* </Hint> */}
          </InDevelopmentHint>

          <Button
            variant="transparent"
            size="iconSm"
            onClick={startConversationCreation}
          >
            <SquarePen className="size-4" />
          </Button>
        </div>
      </div>
    </>
  );
};
