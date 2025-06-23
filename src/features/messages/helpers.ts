import { Message, User } from "@/types/chat";

export const transformMessages = (
  messagesData: any[],
  currentUser?: User
): Message[] => {
  return messagesData.map((msg) => {
    if (!msg.user?.id) {
      console.log(msg, "msg");
    }
    return {
      id: msg.id,
      content: msg.body,
      authorId: msg.user.id,
      author: {
        id: msg.user.id,
        name: msg.user.name,
        avatar: msg.user.image,
        status: "online" as const,
      },
      timestamp: new Date(msg.created_at),
      reactions:
        msg.reactions?.map((reaction: any) => ({
          id: reaction.id,
          emoji: reaction.value,
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
      attachments: msg?.attachments || [],
    };
  });
};
