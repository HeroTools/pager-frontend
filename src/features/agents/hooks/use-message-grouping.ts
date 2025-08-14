import { useCurrentUser } from '@/features/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentConversationData, MessageGroupingState, PendingMessage } from '../types';

const GROUPING_WINDOW_MS = 2000; // 2 seconds

interface UseMessageGroupingOptions {
  workspaceId: string;
  conversationId: string | null;
  conversationData?: AgentConversationData;
  onSendGroupedMessage: (messages: PendingMessage[]) => Promise<void>;
}

export const useMessageGrouping = ({
  workspaceId,
  conversationId,
  conversationData,
  onSendGroupedMessage,
}: UseMessageGroupingOptions) => {
  const { user: currentUser } = useCurrentUser(workspaceId);
  
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const [isGrouping, setIsGrouping] = useState(false);
  
  // Use refs to avoid dependency issues
  const groupingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeStreamingRequestRef = useRef<AbortController | null>(null);
  const onSendGroupedMessageRef = useRef(onSendGroupedMessage);

  // Update ref when callback changes
  useEffect(() => {
    onSendGroupedMessageRef.current = onSendGroupedMessage;
  }, [onSendGroupedMessage]);

  // Track if this is a multi-user conversation
  const isMultiUserConversation = conversationData?.conversation?.conversation_type === 'multi_user_agent';

  const clearGroupingTimer = useCallback(() => {
    if (groupingTimerRef.current) {
      clearTimeout(groupingTimerRef.current);
      groupingTimerRef.current = null;
    }
  }, []);

  const cancelActiveRequest = useCallback(() => {
    if (activeStreamingRequestRef.current) {
      activeStreamingRequestRef.current.abort();
      activeStreamingRequestRef.current = null;
      setIsGrouping(false);
    }
  }, []);

  const sendGroupedMessages = useCallback(async (messages: PendingMessage[]) => {
    try {
      setIsGrouping(true);
      setPendingMessages([]);
      clearGroupingTimer();
      
      await onSendGroupedMessageRef.current(messages);
    } catch (error) {
      console.error('Failed to send grouped messages:', error);
    } finally {
      setIsGrouping(false);
      activeStreamingRequestRef.current = null;
    }
  }, [clearGroupingTimer]);

  const addPendingMessage = useCallback((content: string) => {
    if (!currentUser || !isMultiUserConversation) {
      // For single-user conversations, send immediately
      return false; // Indicates no grouping needed
    }

    const newMessage: PendingMessage = {
      id: `pending-${Date.now()}-${Math.random()}`,
      content,
      userId: currentUser.workspace_member_id,
      userName: currentUser.name,
      timestamp: Date.now(),
    };

    setPendingMessages(prev => {
      const updated = [...prev, newMessage];
      
      // Clear existing timer
      clearGroupingTimer();
      
      // If there's an active streaming request and we have multiple messages, cancel it
      if (activeStreamingRequestRef.current && updated.length > 1) {
        activeStreamingRequestRef.current.abort();
        activeStreamingRequestRef.current = null;
      }

      // Set new timer
      groupingTimerRef.current = setTimeout(() => {
        sendGroupedMessages(updated);
      }, GROUPING_WINDOW_MS);

      return updated;
    });

    return true; // Indicates message was added to grouping
  }, [currentUser, isMultiUserConversation, clearGroupingTimer, sendGroupedMessages]);

  const setActiveStreamingRequest = useCallback((controller: AbortController | null) => {
    activeStreamingRequestRef.current = controller;
  }, []);

  const shouldCancelForNewMessage = useCallback(() => {
    // Cancel if we're in the thinking phase (not generating content yet)
    return activeStreamingRequestRef.current && 
           !activeStreamingRequestRef.current.signal.aborted;
  }, []);

  const cleanup = useCallback(() => {
    clearGroupingTimer();
    cancelActiveRequest();
    setPendingMessages([]);
    setIsGrouping(false);
  }, [clearGroupingTimer, cancelActiveRequest]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const formatGroupedContent = useCallback((messages: PendingMessage[]) => {
    if (messages.length === 1) {
      return messages[0].content;
    }
    return messages.map((msg) => `${msg.userName}: ${msg.content}`).join('\n\n');
  }, []);

  return {
    // State
    isMultiUserConversation,
    isGrouping,
    pendingMessages,
    hasPendingMessages: pendingMessages.length > 0,
    
    // Actions
    addPendingMessage,
    setActiveStreamingRequest,
    cancelActiveRequest,
    shouldCancelForNewMessage,
    cleanup,
    
    // Utilities
    formatGroupedContent,
    isStreamingThinking: (thinkingStatus?: string) => 
      thinkingStatus === 'thinking' || thinkingStatus === 'processing',
  };
};