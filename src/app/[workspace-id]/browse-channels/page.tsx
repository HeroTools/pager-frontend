'use client';

import { Hash, Loader, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAddChannelMembers,
  useCreateChannelModal,
  useGetAllAvailableChannels,
  useGetUserChannels,
  useRemoveChannelMembers,
} from '@/features/channels';
import { LeaveChannelModal } from '@/features/channels/components/leave-channel-modal';
import type { ChannelEntity } from '@/features/channels/types';
import { useCurrentMember } from '@/features/members/hooks/use-members';
import { useParamIds } from '@/hooks/use-param-ids';
import { cn } from '../../../lib/utils';

interface BrowseChannelItem extends ChannelEntity {
  is_member?: boolean;
  member_count?: number;
}

export default function BrowseChannels() {
  const [search, setSearch] = useState<string>('');
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);
  const [hoveredLeaveButtonId, setHoveredLeaveButtonId] = useState<string | null>(null);
  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const [channelToLeave, setChannelToLeave] = useState<BrowseChannelItem | null>(null);

  const { workspaceId } = useParamIds();
  const router = useRouter();
  const openCreateModal = useCreateChannelModal((state) => state.setOpen);
  const addChannelMembers = useAddChannelMembers();
  const removeChannelMembers = useRemoveChannelMembers();
  const { data: currentMember } = useCurrentMember(workspaceId);

  // Fetch all available channels (public + private user is member of)
  const { data: allAvailableChannels = [], isLoading: isLoadingAvailable } =
    useGetAllAvailableChannels(workspaceId);

  // Fetch user's channels to ensure we get all private channels they're in
  const { data: userChannels = [], isLoading: isLoadingUser } = useGetUserChannels(workspaceId);

  // Combine and deduplicate channels
  const combinedChannels = useMemo(() => {
    const channelMap = new Map<string, BrowseChannelItem>();

    allAvailableChannels.forEach((channel) => {
      channelMap.set(channel.id, channel as BrowseChannelItem);
    });

    userChannels.forEach((channel) => {
      const existingChannel = channelMap.get(channel.id);
      if (existingChannel) {
        channelMap.set(channel.id, { ...existingChannel, is_member: true });
      } else {
        channelMap.set(channel.id, { ...(channel as BrowseChannelItem), is_member: true });
      }
    });

    return Array.from(channelMap.values());
  }, [allAvailableChannels, userChannels]);

  const isLoading = isLoadingAvailable || isLoadingUser;

  const displayedChannels = combinedChannels?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleJoinChannel = (channelId: string) => {
    if (!currentMember?.id) return;

    setJoiningChannelId(channelId);
    addChannelMembers.mutate(
      {
        workspaceId,
        channelId,
        data: { memberIds: [currentMember.id] },
      },
      {
        onSuccess: () => setJoiningChannelId(null),
        onError: () => setJoiningChannelId(null),
      },
    );
  };

  const handleOpenChannel = (channelId: string) => {
    router.push(`/${workspaceId}/c-${channelId}`);
  };

  const executeLeave = (channel: BrowseChannelItem) => {
    if (!currentMember) {
      toast.error('Unable to leave channel: membership not found.');
      return;
    }

    removeChannelMembers.mutate(
      {
        workspaceId,
        channelId: channel.id,
        channelMemberIds: [currentMember.id],
        isCurrentUserLeaving: true,
      },
      {
        onSuccess: () => {
          toast.success(
            `Successfully left ${channel.channel_type === 'private' ? <Lock size={10} /> : '#'}${channel.name}`,
          );
          setChannelToLeave(null);
        },
        onError: (error) => {
          console.error('Failed to leave channel:', error);
          toast.error(
            `Failed to leave ${channel.channel_type === 'private' ? <Lock size={10} /> : '#'}${channel.name}`,
          );
          setChannelToLeave(null);
        },
      },
    );
  };

  const handleLeaveChannel = (channel: BrowseChannelItem) => {
    if (channel.channel_type === 'private') {
      setChannelToLeave(channel);
    } else {
      executeLeave(channel);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">All channels</h1>
          <Button onClick={() => openCreateModal(true)}>Create Channel</Button>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Input
            placeholder="Search for channels"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
        </div>

        <div className="bg-muted rounded-lg overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Loader className="mx-auto animate-spin" />
            </div>
          ) : displayedChannels.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No channels found.</div>
          ) : (
            <ul>
              {displayedChannels.map((channel) => {
                const isHoveredLeave = hoveredLeaveButtonId === channel.id;
                return (
                  <li
                    key={channel.id}
                    className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 hover:bg-accent transition cursor-pointer"
                    onClick={() => handleOpenChannel(channel.id)}
                    onMouseEnter={() => setHoveredChannelId(channel.id)}
                    onMouseLeave={() => setHoveredChannelId(null)}
                  >
                    <span>
                      {channel.channel_type === 'public' ? (
                        <Hash className="size-5 text-muted-foreground" />
                      ) : (
                        <Lock className="size-5 text-muted-foreground" />
                      )}
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center">
                          <span className="font-medium truncate">{channel.name}</span>
                          {!isHoveredLeave && hoveredChannelId === channel.id && (
                            <span className="text-xs text-muted-foreground ml-2">View Channel</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center">
                        <div className="flex items-center text-xs text-muted-foreground">
                          {channel.is_member && (
                            <>
                              <span className="text-green-600">Joined</span>
                              <span className="mx-2">·</span>
                            </>
                          )}
                          {channel.member_count} member
                          {channel.member_count !== 1 ? 's' : ''}
                        </div>
                        <div className="text-muted-foreground text-xs">
                          {channel.description && (
                            <>
                              <span className="mx-2">·</span>
                              {channel.description}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenChannel(channel.id)}
                      >
                        Open
                      </Button>
                      {channel.is_member ? (
                        <Button
                          className={cn(
                            'w-20 justify-center',
                            channel.name === 'general' && 'cursor-default',
                          )}
                          variant="outline"
                          size="sm"
                          disabled={
                            removeChannelMembers.isPending && channelToLeave?.id === channel.id
                          }
                          onClick={
                            channel.name !== 'general'
                              ? (e) => {
                                  e.stopPropagation();
                                  handleLeaveChannel(channel);
                                }
                              : undefined
                          }
                          onMouseEnter={() =>
                            channel.name !== 'general' && setHoveredLeaveButtonId(channel.id)
                          }
                          onMouseLeave={() =>
                            channel.name !== 'general' && setHoveredLeaveButtonId(null)
                          }
                        >
                          {isHoveredLeave && channel.name !== 'general' ? 'Leave' : 'Joined'}
                        </Button>
                      ) : (
                        <Button
                          className="w-20 justify-center"
                          variant="default"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleJoinChannel(channel.id);
                          }}
                          disabled={joiningChannelId === channel.id || !currentMember?.id}
                        >
                          {joiningChannelId === channel.id ? 'Joining...' : 'Join'}
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <LeaveChannelModal
        open={!!channelToLeave}
        onOpenChange={(open) => !open && setChannelToLeave(null)}
        channel={channelToLeave}
        onConfirm={() => channelToLeave && executeLeave(channelToLeave)}
        isLeaving={removeChannelMembers.isPending}
      />
    </>
  );
}
