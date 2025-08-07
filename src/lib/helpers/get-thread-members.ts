import type { MemberWithUser } from '@/features/members';

const getThreadMembers = (
  threadParticipantIds: string[],
  members: MemberWithUser[],
): MemberWithUser[] => {
  const idSet = new Set(threadParticipantIds);
  if (!members) {
    return [];
  }
  return members.filter((member) => idSet.has(member.user.id));
};

export default getThreadMembers;
