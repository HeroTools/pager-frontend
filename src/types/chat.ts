export interface User {
  id: string;
  name: string;
  avatar?: string;
  status?: "online" | "away" | "offline";
}

export interface Message {
  id: string;
  content: string;
  authorId: string;
  author: User;
  timestamp: Date;
  image?: string;
  reactions?: Reaction[];
  attachments: Attachment[];
  threadCount?: number;
  isEdited?: boolean;
}

export interface Reaction {
  id: string;
  emoji: string;
  count: number;
  users: User[];
}

export interface Channel {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  memberCount?: number;
}

export interface Attachment {
  content_type: string;
  id: string;
  size_bytes: number;
  public_url: string;
}
