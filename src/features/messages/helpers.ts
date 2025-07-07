import type { Attachment, Author, Message } from '@/types/chat';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import type { CurrentUser } from '@/features/auth';
import { useUIStore } from '@/store/ui-store';
import type { MessageWithUser, QuillDelta, QuillOp } from './types';
import type { Reaction, User } from '../reactions/types';
import type { Attachment as AttachmentType } from '@/types/database';

export const transformMessages = (
  messagesData: MessageWithUser[],
  currentUser?: CurrentUser,
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
        status: 'online' as const,
      } as Author,
      timestamp: new Date(msg.created_at),
      reactions:
        msg.reactions?.map((reaction: Reaction) => ({
          id: reaction.id,
          value: reaction.value,
          count: reaction.count,
          users: reaction.users,
          hasReacted: reaction.users.some((user: User) => user.id === currentUser?.id),
        })) || [],
      threadCount: msg.thread_reply_count || 0,
      threadParticipants: msg.thread_participants || [],
      threadLastReplyAt: msg.thread_last_reply_at || undefined,
      isEdited: !!msg.edited_at,
      isOptimistic: msg._isOptimistic || false,
      attachments:
        msg?.attachments.map(
          (attachment: AttachmentType) =>
            ({
              id: attachment.id,
              contentType: attachment.content_type,
              sizeBytes: attachment.size_bytes,
              publicUrl: attachment.public_url,
              originalFilename: attachment.original_filename,
            }) as Attachment,
        ) || [],
    };
  });
};

export const updateSelectedMessageIfNeeded = (optimisticId: string, realMessage: Message) => {
  const { selectedThreadParentMessage, setSelectedThreadParentMessage } = useUIStore.getState();
  if (selectedThreadParentMessage?.id === optimisticId) {
    setSelectedThreadParentMessage(realMessage);
  }
};

export const formatDateLabel = (dateInput: string | Date): string => {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;

  if (isToday(date)) {
    return 'Today';
  }
  if (isYesterday(date)) {
    return 'Yesterday';
  }
  return format(date, 'MMMM d, yyyy');
};

/**
 * Parses message content and returns a valid Quill Delta
 * Handles both JSON delta format and plain text with graceful fallback
 */
export const parseMessageContent = (content: string | null | undefined): QuillDelta => {
  if (!content || content.trim() === '') {
    return { ops: [{ insert: '\n' }] };
  }

  try {
    const parsed = JSON.parse(content);

    if (isValidDelta(parsed)) {
      return parsed;
    }

    return createPlainTextDelta(content);
  } catch {
    return createPlainTextDelta(content);
  }
};

/**
 * Validates if an object is a valid Quill Delta
 */
const isValidDelta = (obj: unknown): obj is QuillDelta => {
  return (
    obj !== null &&
    typeof obj === 'object' &&
    'ops' in obj &&
    Array.isArray((obj as { ops: unknown }).ops) &&
    (obj as { ops: unknown[] }).ops.length > 0 &&
    (obj as { ops: unknown[] }).ops.every(
      (op: unknown): op is QuillOp =>
        op !== null &&
        typeof op === 'object' &&
        ('insert' in op || 'retain' in op || 'delete' in op),
    )
  );
};

/**
 * Creates a simple delta from plain text
 */
const createPlainTextDelta = (text: string): QuillDelta => {
  const cleanText = text.trim();
  return {
    ops: [
      {
        insert: cleanText + (cleanText.endsWith('\n') ? '' : '\n'),
      },
    ],
  };
};
