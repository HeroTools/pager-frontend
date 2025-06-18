"use client";

import { Loader, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  useGetWorkspace,
  useGetWorkspaces,
} from "@/features/workspaces/hooks/use-workspaces";
import { useCreateWorkspaceModal } from "@/features/workspaces/store/use-create-workspace-modal";
import { useWorkspaceId } from "@/hooks/use-workspace-id";

export const WorkspaceSwitcher = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const setOpen = useCreateWorkspaceModal((state) => state.setOpen);

  const { data: currentWorkspace, isLoading: isLoadingWorkspace } =
    useGetWorkspace(workspaceId);

  const { data: workspaces } = useGetWorkspaces();

  const filteredWorkspaces = workspaces?.filter(
    (workspace) => workspace.id !== currentWorkspace?.id
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild className="outline-none relative">
        <Button className="size-9 relative overflow-hidden bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-xl">
          {isLoadingWorkspace ? (
            <Loader className="size-5 animate-spin shrink-0" />
          ) : (
            currentWorkspace?.name.charAt(0).toUpperCase()
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="bottom" className="w-60">
        <DropdownMenuItem className="cursor-pointer flex-col justify-start items-start capitalize">
          {currentWorkspace?.name}
          <span className="text-xs text-muted-foreground">
            Active workspace
          </span>
        </DropdownMenuItem>
        {filteredWorkspaces?.map((workspace) => (
          <DropdownMenuItem
            key={workspace.id}
            onClick={() => router.push(`/${workspace.id}`)}
            className="cursor-pointer capitalize overflow-hidden"
          >
            <div className="shrink-0 size-9 relative overflow-hidden bg-muted-foreground text-foreground font-semibold text-lg rounded-md flex items-center justify-center mr-2">
              {workspace.name.charAt(0).toUpperCase()}
            </div>
            <p className="truncate">{workspace.name}</p>
          </DropdownMenuItem>
        ))}
        <DropdownMenuItem
          className="cursor-pointer"
          onClick={() => setOpen(true)}
        >
          <div className="size-9 relative overflow-hidden bg-muted-foreground text-foreground font-semibold text-lg rounded-md flex items-center justify-center mr-2">
            <PlusIcon />
          </div>
          Create new workspace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
