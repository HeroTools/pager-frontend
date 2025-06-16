"use client";

import { Bell, Home, MessagesSquare, MoreHorizontal } from "lucide-react";
import { usePathname } from "next/navigation";

import { UserButton } from "@/features/auth/components/user-button";
import { SidebarButton } from "./SidebarButton";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";
import { InDevelopmentHint } from "@/components/InDevelopmentHint";

export const Sidebar = () => {
  const pathname = usePathname();

  return (
    <div className="w-[70px] h-full bg-[#481349] flex flex-col gap-y-4 items-center pt-[9px] pb-4">
      <WorkspaceSwitcher />
      <SidebarButton
        icon={Home}
        label="Home"
        isActive={pathname.includes("/workspace")}
      />
      <InDevelopmentHint>
        <SidebarButton icon={MessagesSquare} label="DMs" disabled />
      </InDevelopmentHint>
      <InDevelopmentHint>
        <SidebarButton icon={Bell} label="Activity" disabled />
      </InDevelopmentHint>
      <InDevelopmentHint>
        <SidebarButton icon={MoreHorizontal} label="More" disabled />
      </InDevelopmentHint>
      <div className="flex flex-col items-center justify-center gap-y-1 mt-auto">
        <UserButton />
      </div>
    </div>
  );
};
