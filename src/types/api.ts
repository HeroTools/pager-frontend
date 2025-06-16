export interface ApiResponse<T> {
  data: T
  error?: string
}

export interface Workspace {
  id: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Channel {
  id: string
  workspaceId: string
  name: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface Message {
  id: string
  channelId: string
  content: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface User {
  id: string
  email: string
  name?: string
  avatarUrl?: string
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  workspaceId: string
  userId: string
  role: 'owner' | 'admin' | 'member'
  createdAt: string
  updatedAt: string
} 