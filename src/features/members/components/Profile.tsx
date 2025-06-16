import {
  AlertTriangle,
  ChevronDownIcon,
  Loader,
  MailIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useConfirm } from "@/hooks/useConfirm";
import { useWorkspaceId } from "@/hooks/useWorkspaceId";
import { Id } from "../../../../convex/_generated/dataModel";
import { useCurrentMember } from "../api/useCurrentMember";
import { useGetMember } from "../api/useGetMember";
import { useRemoveMember } from "../api/useRemoveMember";
import { useUpdateMember } from "../api/useUpdateMember";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProfileProps {
  memberId: Id<"members">;
  onClose: () => void;
}

export const Profile = ({ memberId, onClose }: ProfileProps) => {
  const workspaceId = useWorkspaceId();
  const currentMember = useCurrentMember({ workspaceId });
  const getMember = useGetMember({ id: memberId });
  const updateMember = useUpdateMember();
  const removeMember = useRemoveMember();

  const [ConfirmLeaveDialog, confirmLeave] = useConfirm(
    "Leave workspace",
    "Are you sure you want to leave this workspace?"
  );
  const [ConfirmRemoveDialog, confirmRemove] = useConfirm(
    "Remove member",
    "Are you sure you want to remove this member?"
  );
  const [ConfirmChangeRoleDialog, confirmChangeRole] = useConfirm(
    "Change role",
    "Are you sure you want to change this member's role?"
  );

  const handleRemove = async () => {
    const ok = await confirmRemove();
    if (!ok) return;
    removeMember
      .mutateAsync({
        id: memberId,
      })
      .then(() => {
        toast.success("Member removed");
        onClose();
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to remove member");
      });
  };

  const handleLeave = async () => {
    const ok = await confirmLeave();
    if (!ok) return;
    removeMember
      .mutateAsync({
        id: memberId,
      })
      .then(() => {
        toast.success("You left the workspace");
        onClose();
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to leave the workspace");
      });
  };

  const handleRoleChange = async (role: "admin" | "member") => {
    const ok = await confirmChangeRole();
    if (!ok) return;
    updateMember
      .mutateAsync({
        id: memberId,
        role,
      })
      .then(() => {
        toast.success("Role changed");
        onClose();
      })
      .catch((error) => {
        console.error(error);
        toast.error("Failed to changed role");
      });
  };

  if (getMember.isLoading || currentMember.isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b">
          <p className="text-lg font-bold">Profile</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5] " />
          </Button>
        </div>
        <div className="flex h-full items-center justify-center">
          <Loader className="size-5 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!getMember.data) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b">
          <p className="text-lg font-bold">Profile</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5] " />
          </Button>
        </div>
        <div className="flex flex-col gap-y-2 h-full items-center justify-center">
          <AlertTriangle className="size-5 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <ConfirmChangeRoleDialog />
      <ConfirmLeaveDialog />
      <ConfirmRemoveDialog />
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center h-[49px] px-4 border-b">
          <p className="text-lg font-bold">Profile</p>
          <Button onClick={onClose} size="iconSm" variant="ghost">
            <XIcon className="size-5 stroke-[1.5] " />
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center p-4">
          <Avatar className="max-w-[256px] max-h-[256px] size-full">
            <AvatarImage src={getMember.data.user.image} />
            <AvatarFallback className="aspect-square text-6xl">
              {getMember.data.user.name?.charAt(0).toUpperCase() || "M"}
            </AvatarFallback>
          </Avatar>
        </div>
        <div className="flex flex-col p-4">
          <p className="text-xl font-bold">{getMember.data.user.name}</p>
          {currentMember.data?.role === "admin" &&
            currentMember.data?._id !== memberId && (
              <div className="flex items-center gap-2 mt-4">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full capitalize">
                      {getMember.data.role} <ChevronDownIcon />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-full">
                    <DropdownMenuRadioGroup
                      value={getMember.data.role}
                      onValueChange={(role) =>
                        handleRoleChange(role as "admin" | "member")
                      }
                    >
                      <DropdownMenuRadioItem value="admin">
                        Admin
                      </DropdownMenuRadioItem>
                      <DropdownMenuRadioItem value="member">
                        Member
                      </DropdownMenuRadioItem>
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleRemove}
                >
                  Remove
                </Button>
              </div>
            )}
          {currentMember.data?.role !== "admin" &&
            currentMember.data?._id === memberId && (
              <div className="mt-4">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLeave}
                >
                  Leave
                </Button>
              </div>
            )}
        </div>
        <Separator />
        <div className="flex flex-col p-4">
          <p className="text-sm font-bold mb-4">Contact Information</p>
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-md bg-muted flex items-center justify-center">
              <MailIcon className="size-4" />
            </div>
            <div className="flex flex-col">
              <p className="text-[13px] font-semibold text-muted-foreground">
                Email Address
              </p>
              <Link
                href={`mailto:${getMember.data.user.email}`}
                className="text-sm hover:underline text-[#1264a3]"
              >
                {getMember.data.user.email}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
