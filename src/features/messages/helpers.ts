import { Attachment, Author, Message } from "@/types/chat";
import { CurrentUser } from "../auth";

export const transformMessages = (
  messagesData: any[],
  currentUser?: CurrentUser
): Message[] => {
  return messagesData.map((msg) => {
    return {
      id: msg.id,
      content: msg.body,
      authorId: msg.user.id,
      author: {
        id: msg.user.id,
        name: msg.user.name,
        avatar: msg.user.image,
        status: "online" as const,
      } as Author,
      timestamp: new Date(msg.created_at),
      reactions:
        msg.reactions?.map((reaction: any) => ({
          id: reaction.id,
          value: reaction.value,
          count: reaction.count,
          users: reaction.users,
          hasReacted: reaction.users.some(
            (user: any) => user.id === currentUser?.id
          ),
        })) || [],
      threadCount: msg.thread_reply_count || 0,
      threadParticipants: msg.thread_participants || [],
      lastReplyAt: msg.thread_last_reply_at || null,
      isEdited: !!msg.edited_at,
      isOptimistic: msg._isOptimistic || false,
      attachments:
        msg?.attachments.map(
          (attachment: any) =>
            ({
              id: attachment.id,
              contentType: attachment.content_type,
              sizeBytes: attachment.size_bytes,
              publicUrl: attachment.public_url,
            } as Attachment)
        ) || [],
    };
  });
};
