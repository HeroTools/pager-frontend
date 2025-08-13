import type { ConversationEntity } from '../types';

/**
 * Find an existing conversation that contains exactly the specified member IDs
 * @param conversations - Array of existing conversations
 * @param memberIds - Array of workspace member IDs to find a conversation for
 * @returns The existing conversation or undefined if not found
 */
export const findExistingConversation = (
  conversations: ConversationEntity[],
  memberIds: string[],
): ConversationEntity | undefined => {
  if (memberIds.length === 0) return undefined;

  return conversations.find((conversation) => {
    // For single member (1-on-1 or self-conversation)
    if (memberIds.length === 1) {
      const targetMemberId = memberIds[0];
      
      // Check if it's a direct message (not group conversation)
      if (!conversation.is_group_conversation) {
        // Case 1: Conversation with yourself (member_count === 1)
        if (conversation.member_count === 1) {
          const currentUserMemberId = conversation.members[0]?.workspace_member?.id;
          return currentUserMemberId === targetMemberId;
        }
        
        // Case 2: Regular 1-on-1 conversation (member_count === 2)
        if (conversation.member_count === 2) {
          return conversation.other_members?.some(
            (otherMember) => otherMember.workspace_member?.id === targetMemberId
          );
        }
      }
      return false;
    }
    
    // For group conversations (multiple members), check if the member sets match exactly
    const conversationMemberIds = conversation.members
      .map((member) => member.workspace_member?.id)
      .filter(Boolean);
    
    // Get the current user's ID from the conversation members by finding the member NOT in other_members
    const otherMemberIds = conversation.other_members
      ?.map((member) => member.workspace_member?.id)
      .filter(Boolean) || [];
    
    const currentUserId = conversationMemberIds.find(id => !otherMemberIds.includes(id));
    
    // Filter out the current user's ID from target members to compare with other_members
    const targetOtherIds = memberIds.filter(id => id !== currentUserId);
    
    const sortedOtherIds = [...otherMemberIds].sort();
    const sortedTargetOtherIds = [...targetOtherIds].sort();
    
    // Check if the other members in the conversation exactly match our filtered target members
    const lengthsMatch = sortedOtherIds.length === sortedTargetOtherIds.length;
    const allMembersMatch = lengthsMatch && sortedTargetOtherIds.every((id, index) => id === sortedOtherIds[index]);
    
    return allMembersMatch;
  });
};

/**
 * Check if a conversation with the specified members already exists
 * @param conversations - Array of existing conversations
 * @param memberIds - Array of member IDs to check
 * @returns Boolean indicating if conversation exists
 */
export const conversationExists = (
  conversations: ConversationEntity[],
  memberIds: string[],
): boolean => {
  return findExistingConversation(conversations, memberIds) !== undefined;
};