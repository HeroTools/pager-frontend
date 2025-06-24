"use client";
import { Bell, Home, MessagesSquare, MoreHorizontal } from "lucide-react";
import { UserButton } from "@/features/auth";
import { SidebarButton } from "./sidebar-button";
import { WorkspaceSwitcher } from "./workspace-switcher";
import { useParamIds } from "@/hooks/use-param-ids";

export const Sidebar = () => {
  const { workspaceId } = useParamIds();

  return (
    <div className="w-[70px] h-full bg-sidebar border-r border-border-subtle flex flex-col gap-y-3 items-center pt-4 pb-4">
      <div className="mb-2">
        <WorkspaceSwitcher />
      </div>

      <div className="flex flex-col gap-y-1">
        <SidebarButton icon={Home} label="Home" isActive={true} />
        <SidebarButton icon={MessagesSquare} label="DMs" disabled />
        <SidebarButton icon={Bell} label="Activity" disabled />
        <SidebarButton icon={MoreHorizontal} label="More" disabled />
      </div>

      <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
        <UserButton workspaceId={workspaceId!} />
      </div>
    </div>
  );
};
