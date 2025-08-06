import {
  Edit,
  Globe,
  Hash,
  Lock,
  MoreVertical,
  Plus,
  Save,
  Search,
  Settings,
  Trash2,
  Users,
  UserSearch,
  X,
  XCircle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type FC, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

import AddMembersDialog from '@/components/add-people-to-channel-modal';
import RemoveConfirmation from '@/components/remove-member-from-channel-modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useCurrentUser } from '@/features/auth';
import {
  useAddChannelMembers,
  useDeleteChannel,
  useRemoveChannelMembers,
  useUpdateChannel,
} from '@/features/channels';
import { useConfirm } from '@/hooks/use-confirm';
import { useParamIds } from '@/hooks/use-param-ids';
import { useUIStore } from '@/stores/ui-store';
import { type Channel, ChannelType } from '@/types/chat';
import { ChatMember } from '../features/members';

interface ChannelDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  channel: Channel;
  members?: ChatMember[];
  initialTab?: 'members' | 'settings';
}

export const ChannelDetailsModal: FC<ChannelDetailsModalProps> = ({
  isOpen,
  onClose,
  channel,
  members: channelMembers = [],
  initialTab = 'members',
}) => {
  const { workspaceId } = useParamIds();
  const removeChannelMembers = useRemoveChannelMembers();
  const addChannelMembers = useAddChannelMembers();
  const deleteChannel = useDeleteChannel();
  const updateChannel = useUpdateChannel();
  const { user } = useCurrentUser(workspaceId);
  const { setProfilePanelOpen } = useUIStore();
  const router = useRouter();

  const [ConfirmDeleteDialog, confirmDelete] = useConfirm(
    'Delete Channel',
    `Are you sure you want to delete #${channel.name}? This action cannot be undone and will permanently delete all messages in this channel.`,
  );

  const [activeTab, setActiveTab] = useState<'members' | 'settings'>(initialTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingMembers, setIsAddingMembers] = useState(false);
  const [removeConfirmation, setRemoveConfirmation] = useState<{
    isOpen: boolean;
    channelMemberId?: string;
    channelMemberName?: string;
  }>({ isOpen: false });

  const [isEditingName, setIsEditingName] = useState(false);
  const [isEditingType, setIsEditingType] = useState(false);
  const [editedName, setEditedName] = useState(channel.name);
  const [editedType, setEditedType] = useState(channel.type);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setEditedName(channel.name);
      setEditedType(channel.type);
    }
  }, [isOpen, initialTab, channel.name, channel.type]);

  const filteredMembers = useMemo(() => {
    if (!searchQuery) {
      return channelMembers;
    }
    const query = searchQuery.toLowerCase();
    return channelMembers.filter((member) => {
      return (
        member.workspace_member.user.name.toLowerCase().includes(query) ||
        member.workspace_member.user.email?.toLowerCase().includes(query)
      );
    });
  }, [channelMembers, searchQuery]);

  const handleAddMembers = async (memberIds: string[]) => {
    try {
      await addChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        data: { memberIds },
      });

      setIsAddingMembers(false);
      toast.success('Members added to channel');
    } catch (error) {
      console.error('Failed to add members:', error);
      toast.error('Failed to add members to channel');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [memberId],
        isCurrentUserLeaving: false,
      });

      setRemoveConfirmation({ isOpen: false });
      toast.success('Member removed from channel');
    } catch (error) {
      console.error('Failed to remove member:', error);
      toast.error('Failed to remove member from channel');
    }
  };

  const existingWorkspaceMemberIds = useMemo(() => {
    return channelMembers.map((m) => m.workspace_member.id);
  }, [channelMembers]);

  const currentChannelMember = useMemo(() => {
    return channelMembers.find((member) => member.workspace_member.user.id === user.id);
  }, [user, channelMembers]);

  const isChannelAdmin = useMemo(() => {
    if (!user) {
      return false;
    }

    return currentChannelMember?.role === 'admin';
  }, [user, currentChannelMember]);

  const handleDeleteChannel = async () => {
    const confirmed = await confirmDelete();
    if (!confirmed) {
      return;
    }

    try {
      await deleteChannel.mutateAsync({
        workspaceId,
        channelId: channel.id,
      });

      toast.success('Channel deleted successfully');
      onClose();
      router.push(`/${workspaceId}`);
    } catch (error) {
      console.error('Failed to delete channel:', error);
      toast.error('Failed to delete channel. You must be a channel admin to delete this channel.');
    }
  };

  const handleLeaveChannel = async () => {
    if (!user) {
      toast.error('User not found');
      return;
    }

    if (!currentChannelMember) {
      toast.error('Unable to leave channel - channel membership not found');
      return;
    }

    try {
      await removeChannelMembers.mutateAsync({
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [currentChannelMember.id],
        isCurrentUserLeaving: true,
      });

      toast.success('Left channel successfully');
      onClose();
      router.push(`/${workspaceId}`);
    } catch (error) {
      console.error('Failed to leave channel:', error);
      toast.error('Failed to leave channel');
    }
  };

  const handleSaveName = async () => {
    if (editedName.trim() === channel.name) {
      setIsEditingName(false);
      return;
    }

    if (!editedName.trim()) {
      toast.error('Channel name cannot be empty');
      return;
    }

    try {
      await updateChannel.mutateAsync({
        workspaceId,
        channelId: channel.id,
        data: { name: editedName.trim() },
      });

      setIsEditingName(false);
      toast.success('Channel name updated successfully');
    } catch (error) {
      console.error('Failed to update channel name:', error);
      toast.error('Failed to update channel name');
      setEditedName(channel.name);
    }
  };

  const handleSaveType = async () => {
    if (editedType === channel.type) {
      setIsEditingType(false);
      return;
    }

    try {
      await updateChannel.mutateAsync({
        workspaceId,
        channelId: channel.id,
        data: { channel_type: editedType },
      });

      setIsEditingType(false);
      toast.success('Channel type updated successfully');
    } catch (error) {
      console.error('Failed to update channel type:', error);
      toast.error('Failed to update channel type');
      setEditedType(channel.type);
    }
  };

  const handleCancelEdit = (type: 'name' | 'type') => {
    if (type === 'name') {
      setEditedName(channel.name);
      setIsEditingName(false);
    } else {
      setEditedType(channel.type);
      setIsEditingType(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-2xl w-full h-[90vh] sm:h-[80vh] flex flex-col p-0 overflow-hidden">
          <div className="p-6 pb-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
              {channel.isPrivate ? <Lock className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
              {channel.name}
            </DialogTitle>
          </div>

          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as 'members' | 'settings')}
            className="flex-1 flex flex-col h-full"
          >
            <div className="px-4 sm:px-6">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="members" className="flex items-center gap-2">
                  <Users className="w-4 h-4" /> Members{' '}
                  {channelMembers.length > 0 && `(${channelMembers.length})`}
                </TabsTrigger>
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" /> Settings
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="members" className="flex-1 overflow-hidden flex flex-col mt-0">
              <div className="p-4 sm:p-6 sm:pt-4 space-y-4">
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
                        onClick={() => setSearchQuery('')}
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
                    <span className="hidden sm:inline">Add people</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </div>

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
                              <Avatar
                                className="h-10 w-10 cursor-pointer hover:opacity-80 transition-opacity"
                                onClick={() => {
                                  setProfilePanelOpen(member.workspace_member.id);
                                  onClose();
                                }}
                              >
                                {member.workspace_member.user.image ? (
                                  <AvatarImage
                                    src={member.workspace_member.user.image}
                                    alt={member.workspace_member.user.name}
                                  />
                                ) : (
                                  <AvatarFallback>
                                    {member.workspace_member.user.name?.[0]?.toUpperCase() || 'U'}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p
                                  className="font-medium cursor-pointer hover:underline"
                                  onClick={() => setProfilePanelOpen(member.id)}
                                >
                                  {member.workspace_member.user.name}
                                </p>
                                {member.role === 'admin' && (
                                  <span className="text-xs px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                                    Admin
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {member.workspace_member.user.email || 'Member'}
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
                                    channelMemberId: member.id,
                                    channelMemberName: member.workspace_member.user.name,
                                  })
                                }
                              >
                                Remove from channel
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12">
                        <UserSearch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground font-medium mb-4">No members found</p>
                        <Button variant="outline" onClick={() => setIsAddingMembers(true)}>
                          Invite member
                        </Button>
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
                    {isEditingName ? (
                      <>
                        <Input
                          value={editedName}
                          onChange={(e) => setEditedName(e.target.value)}
                          className="max-w-md"
                          placeholder="Enter channel name"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSaveName();
                            }
                            if (e.key === 'Escape') {
                              handleCancelEdit('name');
                            }
                          }}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveName}
                          disabled={updateChannel.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelEdit('name')}
                          disabled={updateChannel.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input value={channel.name} className="max-w-md" readOnly />
                        <Button
                          variant="outline"
                          onClick={() => setIsEditingName(true)}
                          disabled={!isChannelAdmin}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium">Channel Privacy</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 max-w-md">
                      <p className="text-sm text-muted-foreground">
                        {channel.isPrivate
                          ? 'Private channels can only be viewed or joined by invitation.'
                          : 'Everyone in the workspace can view and join this channel.'}
                      </p>
                    </div>
                    {isEditingType ? (
                      <>
                        <select
                          value={editedType}
                          onChange={(e) => setEditedType(e.target.value as ChannelType)}
                          className="px-3 py-2 border border-input bg-background rounded-md text-sm"
                          disabled={updateChannel.isPending}
                        >
                          <option value={ChannelType.PUBLIC}>Public</option>
                          <option value={ChannelType.PRIVATE}>Private</option>
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleSaveType}
                          disabled={updateChannel.isPending}
                        >
                          <Save className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCancelEdit('type')}
                          disabled={updateChannel.isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingType(true)}
                        disabled={!isChannelAdmin}
                      >
                        {channel.isPrivate ? (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Private
                          </>
                        ) : (
                          <>
                            <Globe className="h-4 w-4 mr-2" />
                            Public
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="pt-4 border-t space-y-3">
                  {isChannelAdmin && (
                    <div className="space-y-2">
                      <h3 className="font-medium text-destructive">Danger Zone</h3>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 max-w-md">
                          <p className="text-sm text-muted-foreground">
                            Permanently delete this channel and all its messages. This action cannot
                            be undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          className="gap-2"
                          onClick={handleDeleteChannel}
                          disabled={deleteChannel.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                          {deleteChannel.isPending ? 'Deleting...' : 'Delete Channel'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!channel.isDefault && (
                    <Button
                      variant="destructive"
                      className="gap-2"
                      onClick={handleLeaveChannel}
                      disabled={removeChannelMembers.isPending}
                    >
                      <XCircle className="h-4 w-4" />
                      {removeChannelMembers.isPending ? 'Leaving...' : 'Leave Channel'}
                    </Button>
                  )}
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
        existingWorkspaceMemberIds={existingWorkspaceMemberIds}
      />

      <RemoveConfirmation
        isOpen={removeConfirmation.isOpen}
        onClose={() => setRemoveConfirmation({ isOpen: false })}
        onConfirm={() =>
          removeConfirmation.channelMemberId &&
          handleRemoveMember(removeConfirmation.channelMemberId)
        }
        channelName={channel.name}
        memberName={removeConfirmation.channelMemberName || ''}
        isPrivate={channel.isPrivate}
      />

      <ConfirmDeleteDialog />
    </>
  );
};
