import type { MemberWithUser } from '@/features/members/types';

/**
 * Creates a memoized lookup map for member names by ID
 * Used for efficient O(1) member name lookups in mentions
 */
export const createMemberLookupMap = (members: any[]): Map<string, string> => {
  const map = new Map<string, string>();
  members.forEach((member) => {
    const name = member.user?.name || 'Unknown';
    map.set(member.id, name);
  });
  return map;
};
