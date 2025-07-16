import type { ChatMember } from '@/features/members';

export const getChatMemberDisplayName = (member: ChatMember): string => {
  if (member.member_type === 'user' && member.workspace_member) {
    return member.workspace_member.user.name;
  }
  if (member.member_type === 'agent' && member.ai_agent) {
    return member.ai_agent.name;
  }
  return 'Unknown Member';
};

export const getChatMemberAvatar = (member: ChatMember): string | undefined => {
  if (member.member_type === 'user' && member.workspace_member) {
    return member.workspace_member.user.image;
  }
  if (member.member_type === 'agent' && member.ai_agent) {
    return member.ai_agent.avatar_url;
  }
  return undefined;
};
