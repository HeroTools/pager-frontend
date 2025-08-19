'use client';

import { Hash, Loader, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useAddChannelMembers,
  useCreateChannelModal,
  useGetAllAvailableChannels,
  useGetUserChannels,
} from '@/features/channels';
import type { ChannelEntity } from '@/features/channels/types';
import { useCurrentMember } from '@/features/members/hooks/use-members';
import { useParamIds } from '@/hooks/use-param-ids';

interface BrowseChannelItem extends ChannelEntity {
  is_member?: boolean;
  member_count?: number;
}

export default function BrowseChannels() {
  const [search, setSearch] = useState<string>('');
  const [hoveredChannelId, setHoveredChannelId] = useState<string | null>(null);

  const [joiningChannelId, setJoiningChannelId] = useState<string | null>(null);
  const { workspaceId } = useParamIds();
  const router = useRouter();
  const openCreateModal = useCreateChannelModal((state) => state.setOpen);
  const addChannelMembers = useAddChannelMembers();
  const { data: currentMember } = useCurrentMember(workspaceId);

  // Fetch all available channels (public + private user is member of)
  const { data: allAvailableChannels = [], isLoading: isLoadingAvailable } =
    useGetAllAvailableChannels(workspaceId);

  // Fetch user's channels to ensure we get all private channels they're in
  const { data: userChannels = [], isLoading: isLoadingUser } = useGetUserChannels(workspaceId);

  // Combine and deduplicate channels
  const combinedChannels = useMemo(() => {
    const channelMap = new Map<string, BrowseChannelItem>();

    // Add all available channels first
    allAvailableChannels.forEach((channel) => {
      channelMap.set(channel.id, channel as BrowseChannelItem);
    });

    // Add user channels, marking them as member if not already marked
    userChannels.forEach((channel) => {
      const existingChannel = channelMap.get(channel.id);
      if (existingChannel) {
        // Update existing channel to ensure is_member is true
        channelMap.set(channel.id, {
          ...existingChannel,
          is_member: true,
        });
      } else {
        // Add new channel (this covers private channels not in allAvailable)
        channelMap.set(channel.id, {
          ...(channel as BrowseChannelItem),
          is_member: true,
        });
      }
    });

    return Array.from(channelMap.values());
  }, [allAvailableChannels, userChannels]);

  const isLoading = isLoadingAvailable || isLoadingUser;

  const displayedChannels = combinedChannels?.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()),
  );

  const handleJoinChannel = (channelId: string) => {
    if (!currentMember?.id) {
      return;
    }

    setJoiningChannelId(channelId);
    addChannelMembers.mutate(
      {
        workspaceId,
        channelId,
        data: {
          memberIds: [currentMember.id],
        },
      },
      {
        onSuccess: () => {
          setJoiningChannelId(null);
        },
        onError: () => {
          setJoiningChannelId(null);
        },
      },
    );
  };

  const handleOpenChannel = (channelId: string) => {
    router.push(`/${workspaceId}/c-${channelId}`);
  };

  return (
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
            {displayedChannels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle last:border-b-0 hover:bg-accent transition cursor-pointer"
                onClick={() => handleOpenChannel(channel.id)}
                onMouseEnter={() => {
                  setHoveredChannelId(channel.id);
                }}
                onMouseLeave={() => {
                  setHoveredChannelId(null);
                }}
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
                      {hoveredChannelId === channel.id && (
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
                  {channel.is_member ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenChannel(channel.id);
                      }}
                    >
                      Open
                    </Button>
                  ) : (
                    <Button
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
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
