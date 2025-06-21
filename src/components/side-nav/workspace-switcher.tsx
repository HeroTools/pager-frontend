"use client";

import { useMemo } from "react";
import { Loader, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useGetWorkspaces } from "@/features/workspaces/hooks/use-workspaces";
import { useCreateWorkspaceModal } from "@/features/workspaces/store/use-create-workspace-modal";
import { useParamIds } from "@/hooks/use-param-ids";

export const WorkspaceSwitcher = () => {
  const router = useRouter();
  const { workspaceId } = useParamIds();
  const setOpen = useCreateWorkspaceModal((state) => state.setOpen);

  const { data: workspaces, isLoading } = useGetWorkspaces();

  const currentWorkspace = useMemo(
    () => workspaces?.find((w) => w.id === workspaceId),
    [workspaces, workspaceId]
  );

  const otherWorkspaces = useMemo(
    () => workspaces?.filter((w) => w.id !== workspaceId),
    [workspaces, workspaceId]
  );

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild className="outline-none relative">
        <Button className="size-9 relative overflow-hidden bg-primary hover:bg-primary/80 text-primary-foreground font-semibold text-xl">
          {isLoading ? (
            <Loader className="size-5 animate-spin shrink-0" />
          ) : (
            currentWorkspace?.name?.charAt(0).toUpperCase()
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" side="bottom" className="w-60">
        <DropdownMenuItem className="cursor-default flex-col items-start capitalize">
          {currentWorkspace?.name || "Unknown Workspace"}
          <span className="text-xs text-muted-foreground">
            Active workspace
          </span>
        </DropdownMenuItem>

        {otherWorkspaces?.map((ws) => (
          <DropdownMenuItem
            key={ws.id}
            onClick={() => router.push(`/${ws.id}`)}
            className="cursor-pointer capitalize overflow-hidden"
          >
            <div className="shrink-0 size-9 relative overflow-hidden bg-muted-foreground text-foreground font-semibold text-lg rounded-md flex items-center justify-center mr-2">
              {ws.name.charAt(0).toUpperCase()}
            </div>
            <p className="truncate">{ws.name}</p>
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
