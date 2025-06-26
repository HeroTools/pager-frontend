import { FC, useState, useMemo, useEffect } from "react";
import {
  Users,
  Settings,
  Lock,
  Hash,
  Search,
  Plus,
  X,
  XCircle,
  MoreVertical,
  UserSearch,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import type { Channel } from "@/types/chat";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  useRemoveChannelMembers,
  useAddChannelMembers,
  useDeleteChannel,
  type ChannelMemberData,
} from "@/features/channels";
import { useGetMembers } from "@/features/members";
import { useCurrentUser } from "@/features/auth";
import { useParamIds } from "@/hooks/use-param-ids";
import { useConfirm } from "@/hooks/use-confirm";
import AddMembersDialog from "./add-people-to-channel-modal";
import RemoveConfirmation from "./remove-member-from-channel-modal";

interface ChannelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  members?: ChannelMemberData[];
  initialTab?: "members" | "settings";
}

export const ChannelDetailsModal: FC<ChannelDetailsModalProps> = ({
  isOpen,
  onClose,
  channel,
  members: channelMembers = [],
  initialTab = "members",
}) => {
  const { workspaceId } = useParamIds();
  const removeChannelMembers = useRemoveChannelMembers();
  const addChannelMembers = useAddChannelMembers();
  const deleteChannel = useDeleteChannel();
  const { user } = useCurrentUser(workspaceId);
  const { data: workspaceMembers = [] } = useGetMembers(workspaceId);
  const router = useRouter();

  const [ConfirmDeleteDialog, confirmDelete] = useConfirm(
    "Delete Channel",
    `Are you sure you want to delete #${channel.name}? This action cannot be undone and will permanently delete all messages in this channel.`
  );

  const [activeTab, setActiveTab] = useState<"members" | "settings">(
    initialTab
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [removeConfirmation, setRemoveConfirmation] = useState<{
    isOpen: boolean;
    memberId?: string;
    memberName?: string;
  }>({ isOpen: false });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) return channelMembers;
    const query = searchQuery.toLowerCase();
    return channelMembers.filter((member) => {
      const workspaceMember = workspaceMembers.find(
        (wm) => wm.id === member.workspace_member_id
      );
      return (
        workspaceMember?.user.name.toLowerCase().includes(query) ||
        workspaceMember?.user.email?.toLowerCase().includes(query)
      );
    });
  }, [channelMembers, searchQuery, workspaceMembers]);

  const handleAddMembers = async (memberIds: string[]) => {
    try {
      await addChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        data: { memberIds },
      });

      setIsAddingMembers(false);
      toast.success("Members added to channel");
    } catch (error) {
      console.error("Failed to add members:", error);
      toast.error("Failed to add members to channel");
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [memberId],
      });

      setRemoveConfirmation({ isOpen: false });
      toast.success("Member removed from channel");
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member from channel");
    }
  };

  const existingMemberIds = useMemo(() => {
    return channelMembers.map((m) => m.workspace_member_id);
  }, [channelMembers]);

  // Check if current user is a channel admin
  const isChannelAdmin = useMemo(() => {
    if (!user) return false;
    
    const currentWorkspaceMember = workspaceMembers.find(
      (wm) => wm.user.id === user.id
    );
    
    if (!currentWorkspaceMember) return false;
    
    const currentChannelMember = channelMembers.find(
      (member) => member.workspace_member_id === currentWorkspaceMember.id
    );
    
    return currentChannelMember?.role === "admin";
  }, [user, workspaceMembers, channelMembers]);

  const handleDeleteChannel = async () => {
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    try {
      await deleteChannel.mutateAsync({
        workspaceId,
        channelId: channel.id,
      });

      toast.success("Channel deleted successfully");
      onClose();
      router.push(`/${workspaceId}`);
    } catch (error) {
      console.error("Failed to delete channel:", error);
      toast.error("Failed to delete channel. You must be a channel admin to delete this channel.");
    }
  };

  const handleLeaveChannel = async () => {
    if (!user) {
      toast.error("User not found");
      return;
    }

    const currentWorkspaceMember = workspaceMembers.find(
      (wm) => wm.user.id === user.id
    );

    if (!currentWorkspaceMember) {
      toast.error("Unable to leave channel - workspace membership not found");
      return;
    }

    const currentChannelMember = channelMembers.find(
      (member) => member.workspace_member_id === currentWorkspaceMember.id
    );

    if (!currentChannelMember) {
      toast.error("Unable to leave channel - channel membership not found");
      return;
    }

    try {
      await removeChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [currentChannelMember.id],
      });

      toast.success("Left channel successfully");
      onClose();
      router.push(`/${workspaceId}`);
    } catch (error) {
      console.error("Failed to leave channel:", error);
      toast.error("Failed to leave channel");
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              {channel.isPrivate ? (
                <Lock className="w-5 h-5" />
              ) : (
                <Hash className="w-5 h-5" />
              )}
              {channel.name}
            </DialogTitle>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) =>
              setActiveTab(value as "members" | "settings")
            }
            className="flex-1 flex flex-col h-full"
          >
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger
                  value="members"
                  className="flex items-center gap-2"
                >
                  <Users className="w-4 h-4" /> Members{" "}
                  {channelMembers.length > 0 && `(${channelMembers.length})`}
                </TabsTrigger>
                <TabsTrigger
                  value="settings"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent
              value="members"
              className="flex-1 overflow-hidden flex flex-col mt-0"
            >
              <div className="p-6 pt-4 space-y-4">
                <div className="flex items-center justify-between gap-7">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search members..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setIsAddingMembers(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add people
                  </Button>
                </div>

                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-1">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => {
                        const workspaceMember = workspaceMembers.find(
                          (wm) => wm.id === member.workspace_member_id
                        );
                        if (!workspaceMember) return null;

                        return (
                          <div
                            key={member.id}
                            className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <Avatar className="h-10 w-10">
                                  {workspaceMember.user.image ? (
                                    <AvatarImage
                                      src={workspaceMember.user.image}
                                      alt={workspaceMember.user.name}
                                    />
                                  ) : (
                                    <AvatarFallback>
                                      {workspaceMember.user.name?.[0]?.toUpperCase() ||
                                        "U"}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">
                                    {workspaceMember.user.name}
                                  </p>
                                  {member.role === "admin" && (
                                    <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {workspaceMember.user.email || "Member"}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 opacity-0 group-hover:opacity-100"
                                >
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() =>
                                    setRemoveConfirmation({
                                      isOpen: true,
                                      memberId: member.id,
                                      memberName: workspaceMember.user.name,
                                    })
                                  }
                                >
                                  Remove from channel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-12">
                        <UserSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-medium mb-4">
                          No members found
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => setIsAddingMembers(true)}
                        >
                          Invite member
                        </Button>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent
              value="settings"
              className="flex-1 overflow-y-auto mt-0"
            >
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Channel Name</h3>
                  <div className="flex items-center gap-2">
                    <Input value={channel.name} className="max-w-md" readOnly />
                    <Button variant="outline">Edit</Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Channel Privacy</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground">
                        {channel.isPrivate
                          ? "Private channels can only be viewed or joined by invitation."
                          : "Everyone in the workspace can view and join this channel."}
                      </p>
                    </div>
                    <Button variant="outline">
                      {channel.isPrivate ? "Private" : "Public"}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  {isChannelAdmin && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-destructive">Danger Zone</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-md">
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this channel and all its messages. This action cannot be undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          onClick={handleDeleteChannel}
                          disabled={deleteChannel.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteChannel.isPending ? "Deleting..." : "Delete Channel"}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <Button
                    variant="destructive"
                    className="gap-2"
                    onClick={handleLeaveChannel}
                    disabled={removeChannelMembers.isPending}
                  >
                    <XCircle className="h-4 w-4" />
                    {removeChannelMembers.isPending
                      ? "Leaving..."
                      : "Leave Channel"}
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AddMembersDialog
        isOpen={isAddingMembers}
        onClose={() => setIsAddingMembers(false)}
        channel={channel}
        onAddMembers={handleAddMembers}
        existingMemberIds={existingMemberIds}
      />

      <RemoveConfirmation
        isOpen={removeConfirmation.isOpen}
        onClose={() => setRemoveConfirmation({ isOpen: false })}
        onConfirm={() =>
          removeConfirmation.memberId &&
          handleRemoveMember(removeConfirmation.memberId)
        }
        channelName={channel.name}
        memberName={removeConfirmation.memberName || ""}
        isPrivate={channel.isPrivate}
      />

      <ConfirmDeleteDialog />
    </>
  );
};
