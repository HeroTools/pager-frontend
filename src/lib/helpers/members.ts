import type { MemberWithUser } from '@/features/members/types';

/**
 * Creates a memoized lookup map for member names by ID
 * Used for efficient O(1) member name lookups in mentions
 */
export const createMemberLookupMap = (members: MemberWithUser[]): Map<string, string> => {
  const map = new Map<string, string>();
  members.forEach((member) => {
    map.set(member.id, member.user.name);
  });
  return map;
};
