import { AxiosResponse } from 'axios';
import { axiosInstance } from '@/lib/axios';

export interface Channel {
  id: string;
  name: string;
  description?: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChannelData {
  name: string;
  description?: string;
  workspaceId: string;
}

export interface ChannelResponse {
  success: boolean;
  data: {
    channel: Channel;
  };
  error?: string;
}

export interface ChannelsResponse {
  success: boolean;
  data: {
    channels: Channel[];
  };
  error?: string;
}

export const channelsApi = {
  getChannels: (workspaceId: string): Promise<AxiosResponse<ChannelsResponse>> => {
    return axiosInstance.get(`/workspaces/${workspaceId}/channels`);
  },

  getChannel: (workspaceId: string, channelId: string): Promise<AxiosResponse<ChannelResponse>> => {
    return axiosInstance.get(`/workspaces/${workspaceId}/channels/${channelId}`);
  },

  createChannel: (data: CreateChannelData): Promise<AxiosResponse<ChannelResponse>> => {
    return axiosInstance.post(`/workspaces/${data.workspaceId}/channels`, data);
  },

  updateChannel: (
    workspaceId: string,
    channelId: string,
    data: Partial<CreateChannelData>
  ): Promise<AxiosResponse<ChannelResponse>> => {
    return axiosInstance.patch(`/workspaces/${workspaceId}/channels/${channelId}`, data);
  },

  deleteChannel: (workspaceId: string, channelId: string): Promise<AxiosResponse> => {
    return axiosInstance.delete(`/workspaces/${workspaceId}/channels/${channelId}`);
  },
}; 