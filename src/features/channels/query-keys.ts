import type { ChannelFilters } from './types';

export const channelsQueryKeys = {
  channels(workspaceId: string, filters?: Partial<ChannelFilters>) {
    return ['channels', workspaceId, filters || null];
  },
  userChannels(workspaceId: string, filters?: Partial<ChannelFilters>) {
    return ['user-channels', workspaceId, filters || null];
  },
  channel(workspaceId: string, channelId: string) {
    return ['channel', workspaceId, channelId];
  },
  channelMessagesInfinite(workspaceId: string, channelId: string) {
    return ['channel', workspaceId, channelId, 'messages', 'infinite'];
  },
  channelMembers(workspaceId: string, channelId: string) {
    return ['channel', workspaceId, channelId, 'members'];
  },
};
