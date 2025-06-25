import React, { useState, useMemo, useEffect } from "react";
import { Channel } from "@/types/chat";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Settings, Lock, Hash, Search, Plus, X, XCircle, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { useRemoveChannelMembers, useAddChannelMembers } from "@/features/channels";
import { useGetMembers } from "@/features/members";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { toast } from "sonner";
import { ChannelMemberData } from "@/features/channels/types";
import MemberSearchSelect from "@/components/member-search-select";

interface RemoveConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  channelName: string;
  memberName: string;
  isPrivate: boolean;
}

const RemoveConfirmation: React.FC<RemoveConfirmationProps> = ({
  isOpen,
  onClose,
  onConfirm,
  channelName,
  memberName,
  isPrivate
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent className="sm:max-w-md">
      <DialogTitle>
        Remove {memberName} from #{channelName}?
      </DialogTitle>
      <p className="text-sm text-muted-foreground mt-2">
        {!isPrivate 
          ? "They'll still be able to rejoin, or be added to the conversation."
          : "They won't be able to rejoin unless they are invited by someone in this channel."}
      </p>
      <div className="flex justify-end gap-3 mt-4">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={onConfirm}>
          Remove
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

interface ChannelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  members?: ChannelMemberData[];
  initialTab?: "members" | "settings";
}

export const ChannelDetailsModal: React.FC<ChannelDetailsModalProps> = ({
  isOpen,
  onClose,
  channel,
  members: channelMembers = [],
  initialTab = "members",
}) => {
  const workspaceId = useWorkspaceId() as string;
  const removeChannelMembers = useRemoveChannelMembers();
  const addChannelMembers = useAddChannelMembers();
  const { data: workspaceMembers = [] } = useGetMembers(workspaceId);
  
  const [activeTab, setActiveTab] = useState<"members" | "settings">(initialTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<ChannelMemberData[]>([]);
  const [removeConfirmation, setRemoveConfirmation] = useState<{
    isOpen: boolean;
    memberId?: string;
    memberName?: string;
  }>({ isOpen: false });

  // Update active tab when initialTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return channelMembers;
    const query = searchQuery.toLowerCase();
    return channelMembers.filter(member => {
      const workspaceMember = workspaceMembers.find(wm => wm.id === member.workspace_member_id);
      return workspaceMember?.user.name.toLowerCase().includes(query) || 
             workspaceMember?.user.email?.toLowerCase().includes(query);
    });
  }, [channelMembers, searchQuery, workspaceMembers]);

  const handleAddMembers = async () => {
    try {
      await addChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        data: {
          workspace_member_ids: selectedMembers.map(member => member.workspace_member_id)
        }
      });
      
      setSelectedMembers([]);
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
        channelMemberIds: [memberId]
      });
      
      setRemoveConfirmation({ isOpen: false });
      toast.success("Member removed from channel");
    } catch (error) {
      console.error("Failed to remove member:", error);
      toast.error("Failed to remove member from channel");
    }
  };

  // Get the list of workspace members that can be added
  const availableMembers = useMemo(() => {
    return workspaceMembers;
  }, [workspaceMembers]);

  // Get the list of existing member IDs
  const existingMemberIds = useMemo(() => {
    return channelMembers.map(m => m.workspace_member_id);
  }, [channelMembers]);

  console.log(channelMembers, 'channelMembers');
  console.log(filteredMembers, 'filteredMembers');
  // console.log(, 'filteredMembers');

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-2xl w-full h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              {channel.isPrivate ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
              {channel.name}
            </DialogTitle>
          </div>
          
          <Tabs 
            value={activeTab} 
            onValueChange={(value) => setActiveTab(value as "members" | "settings")}
            className="flex-1 flex flex-col h-full"
          >
            <div className="px-6">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Members {channelMembers.length > 0 && `(${channelMembers.length})`}
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col mt-0">
              <div className="p-6 pt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search members..."
                      className="pl-10"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setIsAddingMembers(true)}
                  >
                    <Plus className="h-4 w-4" /> Add members
                  </Button>
                </div>

                {isAddingMembers && (
                  <div className="border rounded-md p-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h4 className="font-medium">Add members</h4>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 w-8 p-0"
                        onClick={() => {
                          setIsAddingMembers(false);
                          setSelectedMembers([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <MemberSearchSelect
                      selectedMembers={selectedMembers}
                      onMemberSelect={(member) => setSelectedMembers(prev => [...prev, member])}
                      onMemberRemove={(memberId) => setSelectedMembers(prev => prev.filter(m => m.id !== memberId))}
                      availableMembers={availableMembers}
                      existingMemberIds={existingMemberIds}
                      placeholder="Search for members to add..."
                    />
                    
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setIsAddingMembers(false);
                          setSelectedMembers([]);
                        }}
                      >
                        Cancel
                      </Button>
                      <Button 
                        size="sm"
                        onClick={handleAddMembers}
                        disabled={selectedMembers.length === 0}
                      >
                        Add {selectedMembers.length > 0 ? `(${selectedMembers.length})` : ''} members
                      </Button>
                    </div>
                  </div>
                )}

                <ScrollArea className="h-[300px] pr-4">
                  <div className="space-y-1">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => {
                        const workspaceMember = workspaceMembers.find(wm => wm.id === member.workspace_member_id);
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
                                    <AvatarImage src={workspaceMember.user.image} alt={workspaceMember.user.name} />
                                  ) : (
                                    <AvatarFallback>
                                      {workspaceMember.user.name?.[0]?.toUpperCase() || 'U'}
                                    </AvatarFallback>
                                  )}
                                </Avatar>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium">{workspaceMember.user.name}</p>
                                  {member.role === 'admin' && (
                                    <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                                      Admin
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {workspaceMember.user.email || 'Member'}
                                </p>
                              </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={() => setRemoveConfirmation({ 
                                    isOpen: true, 
                                    memberId: member.id,
                                    memberName: workspaceMember.user.name
                                  })}
                                >
                                  Remove from channel
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        No members found
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="settings" className="flex-1 overflow-y-auto mt-0">
              <div className="p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-medium">Channel Name</h3>
                  <div className="flex items-center gap-2">
                    <Input 
                      value={channel.name}
                      className="max-w-md"
                      readOnly
                    />
                    <Button variant="outline">Edit</Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-medium">Channel Description</h3>
                  <div className="flex items-start gap-2">
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground mb-2">
                        Let people know what this channel is for.
                      </p>
                      <Input 
                        value={channel.description || ""}
                        placeholder="What's this channel about?"
                        readOnly
                      />
                    </div>
                    <Button variant="outline" className="mt-6">Edit</Button>
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
                
                <div className="pt-4 border-t">
                  <Button variant="destructive" className="gap-2">
                    <XCircle className="h-4 w-4" />
                    Leave Channel
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <RemoveConfirmation
        isOpen={removeConfirmation.isOpen}
        onClose={() => setRemoveConfirmation({ isOpen: false })}
        onConfirm={() => removeConfirmation.memberId && handleRemoveMember(removeConfirmation.memberId)}
        channelName={channel.name}
        memberName={removeConfirmation.memberName || ''}
        isPrivate={channel.isPrivate}
      />
    </>
  );
};
