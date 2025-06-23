import React, { useState, useMemo } from "react";
import { Channel } from "@/types/chat";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Users, Settings, Lock, Hash, Search, Plus, X, Check, XCircle, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { 
  DropdownMenu, 
  DropdownMenuTrigger, 
  DropdownMenuContent, 
  DropdownMenuItem 
} from "@/components/ui/dropdown-menu";
import { useWorkspaceId } from "@/hooks/use-workspace-id";
import { useGetMembers } from "@/features/members";
import MemberSearchSelect from "@/components/member-search-select";
import { MemberWithUser } from "@/features/members/types";

interface Member {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  role?: 'admin' | 'member';
  status?: 'online' | 'offline' | 'away';
}

interface ChannelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  members?: Member[];
}

interface AddChannelMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  channelMembers: Member[];
  onMembersAdded: (newMembers: MemberWithUser[]) => void;
  workspaceId: string;
}

const AddChannelMembersModal: React.FC<AddChannelMembersModalProps> = ({
  isOpen,
  onClose,
  channelMembers,
  onMembersAdded,
  workspaceId,
}) => {
  const { data: allMembers = [], isLoading } = useGetMembers(workspaceId);
  const [selectedMembers, setSelectedMembers] = useState<MemberWithUser[]>([]);

  // IDs of members already in the channel (these are user IDs from the header)
  const channelUserIds = new Set(channelMembers.map((m) => m.id));

  // Debug logging to see what we're comparing
  console.log("Channel user IDs:", Array.from(channelUserIds));
  console.log("All workspace members:", allMembers.map(m => ({ 
    memberId: m.id, 
    userId: m.user.id, 
    name: m.user.name 
  })));

  // Only allow selection of members not already in the channel
  const availableMembers = allMembers;

  const handleSelect = (member: MemberWithUser) => {
    if (!channelUserIds.has(member.user.id) && !selectedMembers.find((m) => m.id === member.id)) {
      setSelectedMembers((prev) => [...prev, member]);
    }
  };

  const handleRemove = (memberId: string) => {
    setSelectedMembers((prev) => prev.filter((m) => m.id !== memberId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMembers.length > 0) {
      onMembersAdded(selectedMembers);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg w-full">
        <DialogHeader>
          <DialogTitle>Add people to # channel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Add workspace members to this channel.</p>
            <MemberSearchSelect
              selectedMembers={selectedMembers}
              onMemberSelect={handleSelect}
              onMemberRemove={handleRemove}
              availableMembers={availableMembers}
              placeholder="Type a name to add..."
              excludedMemberIds={new Set(allMembers.filter(m => channelUserIds.has(m.user.id)).map(m => m.id))}
            />
          </div>
          <div>
            {/* List of already-in-channel members matching search, if any */}
            {selectedMembers.length === 0 && (
              <div className="text-xs text-muted-foreground mt-2">
                Members already in this channel will be tagged and cannot be added again.
              </div>
            )}
            <div className="mt-2">
              {isLoading && <div className="text-sm">Loading members...</div>}
              {!isLoading && availableMembers.length === 0 && (
                <div className="text-sm text-muted-foreground">No members found.</div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={selectedMembers.length === 0}>Add{selectedMembers.length > 0 ? ` (${selectedMembers.length})` : ''}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export const ChannelDetailsModal: React.FC<ChannelDetailsModalProps> = ({
  isOpen,
  onClose,
  channel,
  members: initialMembers = [],
}) => {
  const [activeTab, setActiveTab] = useState("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  // Get workspaceId from channel or fallback to useWorkspaceId
  const workspaceId = (channel as any).workspace_id || useWorkspaceId();

  // Filter members based on search query
  const filteredMembers = useMemo(() => {
    if (!searchQuery) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(member => 
      member.name.toLowerCase().includes(query) || 
      member.email?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  return (
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
          onValueChange={setActiveTab}
          className="flex-1 flex flex-col h-full"
        >
          <div className="px-6">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="members" className="flex items-center gap-2">
                <Users className="w-4 h-4" /> Members {members.length > 0 && `(${members.length})`}
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
                  onClick={() => setIsAddModalOpen(true)}
                >
                  <Plus className="h-4 w-4" /> Add members
                </Button>
              </div>

              {isAddModalOpen && (
                <AddChannelMembersModal
                  isOpen={isAddModalOpen}
                  onClose={() => setIsAddModalOpen(false)}
                  channelMembers={members}
                  onMembersAdded={(newMembers) => {
                    // Convert MemberWithUser to Member for local state
                    const mapped = newMembers.map(m => ({
                      id: m.id,
                      name: m.user.name,
                      email: m.user.email,
                      avatar: m.user.image,
                      role: m.role,
                    }));
                    setMembers((prev) => [...prev, ...mapped]);
                    setIsAddModalOpen(false);
                  }}
                  workspaceId={workspaceId}
                />
              )}

              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-1">
                  {filteredMembers.length > 0 ? (
                    filteredMembers.map((member) => (
                      <div 
                        key={member.id} 
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <Avatar className="h-10 w-10">
                              {member.avatar ? (
                                <AvatarImage src={member.avatar} alt={member.name} />
                              ) : (
                                <AvatarFallback>
                                  {member.name?.[0]?.toUpperCase() || 'U'}
                                </AvatarFallback>
                              )}
                            </Avatar>
                            {member.status && (
                              <div className={cn(
                                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background",
                                member.status === 'online' ? 'bg-green-500' : 
                                member.status === 'away' ? 'bg-yellow-500' : 'bg-gray-400'
                              )} />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{member.name}</p>
                              {member.role === 'admin' && (
                                <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {member.email || 'Member'}
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
                            <DropdownMenuItem>Message</DropdownMenuItem>
                            <DropdownMenuItem>Mention</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              Remove from channel
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ))
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
  );
};
