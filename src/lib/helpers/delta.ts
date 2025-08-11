import type { Delta } from 'quill';
import type { Op } from 'quill/core';

interface QuillDeltaOp {
  insert?:
    | string
    | { mention?: { id: string; name?: string } }
    | { image?: string }
    | { video?: string };
  attributes?: {
    link?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

/**
 * Checks if a Quill Delta has meaningful content (text, mentions, embeds)
 */
export const hasDeltaContent = (delta: Delta | null): boolean => {
  if (!delta) return false;
  const ops = delta.ops || [];
  return ops.some((op) => {
    if (typeof op.insert === 'string') {
      return op.insert.trim().length > 0;
    }
    // Has embeds (mentions, images, videos, etc.)
    return op.insert && typeof op.insert === 'object';
  });
};

/**
 * Alias for hasDeltaContent with inverted logic for clarity
 */
export const isDeltaEmpty = (delta: Delta | null): boolean => {
  return !hasDeltaContent(delta);
};

/**
 * Enriches mention ops with names from a member lookup map
 */
export const enrichDeltaWithMentions = (
  content: any,
  memberLookup: Map<string, string>,
): any => {
  if (!content || !content.ops) return content || [];

  return {
    ...content,
    ops: content.ops.map((op: QuillDeltaOp) => {
      if (!op.insert || typeof op.insert !== 'object') return op;
      if (!('mention' in op.insert)) return op;

      const mentionData = op.insert.mention;
      const memberId = typeof mentionData === 'string' ? mentionData : mentionData.id;

      return {
        ...op,
        insert: {
          mention: {
            id: memberId,
            name: memberLookup.get(memberId) || 'Unknown User',
          },
        },
      };
    }),
  };
};

/**
 * Extracts plain text from a Delta, resolving mentions to names
 */
export const getPlainTextFromDelta = (delta: Delta | null, memberLookup: Map<string, string>): string => {
  if (!delta) return '';
  const ops = delta.ops || [];
  let text = '';

  ops.forEach((op: any) => {
    if (typeof op.insert === 'string') {
      text += op.insert;
    } else if (op.insert?.mention) {
      const memberId =
        typeof op.insert.mention === 'string' ? op.insert.mention : op.insert.mention?.id;
      const memberName = memberLookup.get(memberId);
      text += memberName ? `@${memberName}` : '@Unknown User';
    } else if (op.insert?.image) {
      text += '[Image]';
    } else if (op.insert?.video) {
      text += '[Video]';
    }
  });

  const trimmedText = text.trim();
  // Ensure we have some text for embeds-only content
  return trimmedText || (hasDeltaContent(delta) ? ' ' : '');
};
