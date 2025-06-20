import { Button } from "@/components/ui/button";
import { useWorkspaceId } from '@/hooks/use-workspace-id';
import { LucideIcon } from "lucide-react";
import Link from "next/link";
import { IconType } from "react-icons/lib";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

interface SidebarItemProps {
  label: string;
  id: string;
  icon: LucideIcon | IconType;
  disabled?: boolean;
  variant?: VariantProps<typeof sidebarItemVariants>["variant"];
}

const sidebarItemVariants = cva(
  "flex items-center gap-1.5 justify-start font-normal h-7 px-[18px] text-sm overflow-hidden",
  {
    variants: {
      variant: {
        default: "text-foreground hover:bg-secondary/90",
        active: "text-foreground bg-secondary/90 hover:bg-secondary/90",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export const SidebarItem = ({
  icon: Icon,
  id,
  label,
  disabled,
  variant,
}: SidebarItemProps) => {
  const workspaceId = useWorkspaceId();

  if (disabled) {
    return (
      <Button
        variant="transparent"
        className={cn(sidebarItemVariants({ variant }))}
        disabled={disabled}
      >
        <Icon className="size-3.5 mr-1 shrink-0" />
        <span className="text-sm truncate">{label}</span>
      </Button>
    );
  }

  return (
    <Button
      variant="transparent"
      asChild
      className={cn(sidebarItemVariants({ variant }))}
    >
      {/* // come back to this */}
      <Link href={`/${workspaceId}/c-${id}`}>
        <Icon className="size-3.5 mr-1 shrink-0" />
        <span className="text-sm truncate">{label}</span>
      </Link>
    </Button>
  );
};
