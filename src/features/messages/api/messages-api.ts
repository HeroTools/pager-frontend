import { AxiosResponse } from 'axios';
import { axiosInstance } from '@/lib/axios';

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageData {
  content: string;
  channelId: string;
}

export interface MessageResponse {
  success: boolean;
  data: {
    message: Message;
  };
  error?: string;
}

export interface MessagesResponse {
  success: boolean;
  data: {
    messages: Message[];
    hasMore: boolean;
  };
  error?: string;
}

export const messagesApi = {
  getMessages: (
    channelId: string,
    params?: { before?: string; limit?: number }
  ): Promise<AxiosResponse<MessagesResponse>> => {
    return axiosInstance.get(`/channels/${channelId}/messages`, { params });
  },

  createMessage: (data: CreateMessageData): Promise<AxiosResponse<MessageResponse>> => {
    return axiosInstance.post(`/channels/${data.channelId}/messages`, data);
  },

  updateMessage: (
    channelId: string,
    messageId: string,
    content: string
  ): Promise<AxiosResponse<MessageResponse>> => {
    return axiosInstance.patch(`/channels/${channelId}/messages/${messageId}`, { content });
  },

  deleteMessage: (channelId: string, messageId: string): Promise<AxiosResponse> => {
    return axiosInstance.delete(`/channels/${channelId}/messages/${messageId}`);
  },
}; 