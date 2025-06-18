"use client";

import { Bell, Home, MessagesSquare, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { UserButton } from "@/features/auth/components/user-button";
import { SidebarButton } from './sidebar-button';
import { WorkspaceSwitcher } from './workspace-switcher';

export const Sidebar = () => {
  const pathname = usePathname();
  const workspaceId = useWorkspaceId() as string;


  return (
    <div className="w-[70px] h-full flex flex-col gap-y-4 items-center pt-[9px] pb-4">
      <WorkspaceSwitcher />
      <SidebarButton
        icon={Home}
        label="Home"
        // isActive={pathname.endsWith("/${workspaceId}")}
        isActive={true}
      />
        <SidebarButton icon={MessagesSquare} label="DMs" disabled />
        <SidebarButton icon={Bell} label="Activity" disabled />
        <SidebarButton icon={MoreHorizontal} label="More" disabled />
      <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
        <UserButton />
      </div>
    </div>
  );
};
