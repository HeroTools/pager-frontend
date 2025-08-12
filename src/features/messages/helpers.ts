import type { CurrentUser } from '@/features/auth';
import { useUIStore } from '@/stores/ui-store';
import type { Attachment, Author, Message } from '@/types/chat';
import type { Attachment as AttachmentType } from '@/types/database';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { ChatMember, MemberWithUser } from '../members';
import type { Reaction, User } from '../reactions/types';
import type { MessageWithUser, QuillDelta, QuillOp } from './types';

export const transformMessages = (
  messagesData: MessageWithUser[],
  currentUser?: CurrentUser,
): Message[] => {
  return messagesData.map((msg) => {
    let author = {
      id: '',
      name: 'Unknown',
      avatar: undefined as string | undefined,
    };

    switch (msg.sender_type) {
      case 'user':
        author = {
          id: msg.user?.id || '',
          name: msg.user?.name || 'Unknown User',
          avatar: msg.user?.image,
        };
        break;

      case 'agent':
        author = {
          id: msg.user?.id || 'agent',
          name: msg.user?.name || 'AI Assistant',
          avatar: msg.user?.image,
        };
        break;

      case 'system':
        author = {
          id: msg.user?.id || 'system',
          name: msg.user?.name || 'System',
          avatar: msg.user?.image,
        };
        break;

      default:
        // Fallback for backward compatibility
        if (msg.user) {
          author = {
            id: msg.user.id,
            name: msg.user.name,
            avatar: msg.user.image,
          };
        }
    }
    return {
      id: msg.id,
      content: msg.body,
      authorId: author.id,
      author: {
        id: author.id,
        name: author.name,
        avatar: author.avatar,
        status: 'online' as const,
      } as Author,
      timestamp: new Date(msg.created_at),
      reactions:
        msg.reactions?.map((reaction: Reaction) => ({
          id: reaction.id,
          value: reaction.value,
          count: reaction.count,
          users: reaction.users || [],
          hasReacted: reaction.users?.some((user: User) => user.id === currentUser?.id) ?? false,
        })) || [],
      threadCount: msg.thread_reply_count || 0,
      threadParticipants: msg.thread_participants || [],
      threadLastReplyAt: msg.thread_last_reply_at || undefined,
      isEdited: !!msg.edited_at,
      isOptimistic: msg._isOptimistic || false,
      sender_type: msg.sender_type || 'user',
      attachments:
        msg?.attachments.map(
          (attachment: AttachmentType) =>
            ({
              id: attachment.id,
              contentType: attachment.content_type,
              sizeBytes: attachment.size_bytes,
              storageUrl: attachment.storage_url,
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
 * Converts <@workspace_member_id> patterns to mention blots
 */
export const parseMessageContent = (
  content: string | null | undefined,
  members?: ChatMember[] | MemberWithUser[],
): QuillDelta => {
  if (!content || content.trim() === '') {
    return { ops: [{ insert: '\n' }] };
  }

  try {
    const parsed = JSON.parse(content);

    if (isValidDelta(parsed)) {
      // Check if any ops contain plain text with <@id> patterns
      const processedOps = parsed.ops
        .map((op: QuillOp) => {
          if (typeof op.insert === 'string' && op.insert.includes('<@')) {
            // Convert <@id> patterns in existing delta ops
            return convertMentionsInOp(op, members);
          }
          return op;
        })
        .flat();

      return { ops: processedOps };
    }

    return createPlainTextDeltaWithMentions(content, members);
  } catch {
    return createPlainTextDeltaWithMentions(content, members);
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
 * Helper function to convert mentions in a single op
 */
const convertMentionsInOp = (op: QuillOp, members?: ChatMember[] | MemberWithUser[]): QuillOp[] => {
  if (typeof op.insert !== 'string') return [op];

  const text = op.insert;
  const mentionRegex = /<@([a-zA-Z0-9-_]+)>/g;
  const ops: QuillOp[] = [];
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(text)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      ops.push({
        insert: text.substring(lastIndex, match.index),
        ...(op.attributes && { attributes: op.attributes }),
      });
    }

    // Add the mention as a mention blot with only ID
    const memberId = match[1];
    ops.push({
      insert: {
        mention: {
          id: memberId,
        },
      },
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < text.length) {
    ops.push({
      insert: text.substring(lastIndex),
      ...(op.attributes && { attributes: op.attributes }),
    });
  }

  return ops.length > 0 ? ops : [op];
};

/**
 * Creates a delta from plain text with mention conversion
 */
const createPlainTextDeltaWithMentions = (
  text: string,
  members?: ChatMember[] | MemberWithUser[],
): QuillDelta => {
  const cleanText = text.trim();
  const ops: QuillOp[] = [];

  // Regular expression to match <@workspace_member_id> patterns
  const mentionRegex = /<@([a-zA-Z0-9-_]+)>/g;
  let lastIndex = 0;
  let match;

  while ((match = mentionRegex.exec(cleanText)) !== null) {
    // Add text before the mention
    if (match.index > lastIndex) {
      ops.push({ insert: cleanText.substring(lastIndex, match.index) });
    }

    // Add the mention as a mention blot with only ID
    const memberId = match[1];
    ops.push({
      insert: {
        mention: {
          id: memberId,
        },
      },
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last mention
  if (lastIndex < cleanText.length) {
    ops.push({ insert: cleanText.substring(lastIndex) });
  }

  // If no mentions were found, just insert the text as is
  if (ops.length === 0) {
    ops.push({ insert: cleanText });
  }

  // Ensure it ends with a newline
  if (!cleanText.endsWith('\n')) {
    ops.push({ insert: '\n' });
  }

  return { ops };
};

/**
 * Creates a simple delta from plain text (fallback for when no members data)
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

export const getUserName = (userId: string, members: ChatMember[]) => {
  if (!members) {
    return 'Unknown';
  }

  const member = members.find((member) => {
    return member.workspace_member.user.id === userId;
  });

  if (!member) {
    return 'Unknown';
  }

  return member.workspace_member.user.name;
};

export const getUserAvatar = (userId: string, members: ChatMember[]) => {
  if (!members) {
    return 'Unknown';
  }

  const member = members.find((member) => {
    return member.workspace_member.user.id === userId;
  });

  if (!member) {
    return 'Unknown';
  }

  return member.workspace_member.user.image;
};
