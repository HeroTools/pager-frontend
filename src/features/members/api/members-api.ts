import { AxiosResponse } from 'axios';
import { axiosInstance } from '@/lib/axios';

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
}

export interface Member {
  id: string;
  userId: string;
  workspaceId: string;
  role: 'owner' | 'admin' | 'member';
  createdAt: string;
  updatedAt: string;
  user: User;
}

export interface MemberResponse {
  success: boolean;
  data: {
    member: Member;
  };
  error?: string;
}

export interface MembersResponse {
  success: boolean;
  data: {
    members: Member[];
  };
  error?: string;
}

export const membersApi = {
  getMembers: (workspaceId: string): Promise<AxiosResponse<MembersResponse>> => {
    return axiosInstance.get(`/workspaces/${workspaceId}/members`);
  },

  getMember: (workspaceId: string, memberId: string): Promise<AxiosResponse<MemberResponse>> => {
    return axiosInstance.get(`/workspaces/${workspaceId}/members/${memberId}`);
  },

  getCurrentMember: (workspaceId: string): Promise<AxiosResponse<MemberResponse>> => {
    return axiosInstance.get(`/workspaces/${workspaceId}/members/current`);
  },

  updateMemberRole: (
    workspaceId: string,
    memberId: string,
    role: Member['role']
  ): Promise<AxiosResponse<MemberResponse>> => {
    return axiosInstance.patch(`/workspaces/${workspaceId}/members/${memberId}`, { role });
  },

  removeMember: (workspaceId: string, memberId: string): Promise<AxiosResponse> => {
    return axiosInstance.delete(`/workspaces/${workspaceId}/members/${memberId}`);
  },
}; 