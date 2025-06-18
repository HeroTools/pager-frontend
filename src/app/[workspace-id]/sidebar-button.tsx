import { LucideIcon } from "lucide-react";
import { IconType } from "react-icons/lib";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarButtonProps {
  icon: LucideIcon | IconType;
  label: string;
  isActive?: boolean;
  disabled?: boolean;
}

export const SidebarButton = ({
  icon: Icon,
  label,
  isActive,
  disabled,
}: SidebarButtonProps) => {
  return (
    <div className="flex flex-col items-center justify-center gap-y-0.5 cursor-pointer group">
      <Button
        variant="transparent"
        className={cn(
          "size-9 p-2 group-hover:bg-foreground/20",
          isActive && "bg-foreground/20"
        )}
        disabled={disabled}
      >
        <Icon className="size-5 text-foreground group-hover:scale-110 transition-all" />
      </Button>
      <span className="text-[11px] text-foreground">
        {label}
      </span>
    </div>
  );
};
