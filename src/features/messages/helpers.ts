import { Attachment, Author, Message } from "@/types/chat";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { CurrentUser } from "@/features/auth";
import { useUIStore } from "@/store/ui-store";
import type { MessageWithUser } from "./types";

export const transformMessages = (
  messagesData: MessageWithUser[],
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
      threadLastReplyAt: msg.thread_last_reply_at || undefined,
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
              originalFilename: attachment.original_filename,
            } as Attachment)
        ) || [],
    };
  });
};

export const updateSelectedMessageIfNeeded = (
  optimisticId: string,
  realMessage: Message
) => {
  const { selectedThreadParentMessage, setSelectedThreadParentMessage } =
    useUIStore.getState();
  if (selectedThreadParentMessage?.id === optimisticId) {
    setSelectedThreadParentMessage(realMessage);
  }
};

export const formatDateLabel = (dateInput: string | Date): string => {
  const date = typeof dateInput === "string" ? parseISO(dateInput) : dateInput;

  if (isToday(date)) {
    return "Today";
  }
  if (isYesterday(date)) {
    return "Yesterday";
  }
  return format(date, "MMMM d, yyyy");
};
