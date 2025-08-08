import { useCallback, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase/client';
import { usePresenceStore, type UserPresence } from '@/stores/presence-store';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface UsePresenceOptions {
  workspaceId: string;
  userId: string;
  workspaceMemberId: string;
  channelId?: string;
  conversationId?: string;
  enabled?: boolean;
}

export function usePresence({
  workspaceId,
  userId,
  workspaceMemberId,
  channelId,
  conversationId,
  enabled = true,
}: UsePresenceOptions) {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const { setPresence, setPresences, setMyPresence, clearPresences } = usePresenceStore();

  const trackPresence = useCallback(async () => {
    if (!channelRef.current) return;

    const userPresence: UserPresence = {
      userId,
      workspaceMemberId,
      status: 'online',
      lastSeen: new Date().toISOString(),
      currentChannelId: channelId,
      currentConversationId: conversationId,
    };

    const result = await channelRef.current.track(userPresence);

    if (result === 'ok') {
      setMyPresence(userPresence);
    }

    return result;
  }, [userId, workspaceMemberId, channelId, conversationId, setMyPresence]);

  const updatePresence = useCallback(
    async (updates: {
      status?: 'online' | 'away' | 'offline';
      channelId?: string;
      conversationId?: string;
    }) => {
      if (!channelRef.current) return;

      const currentPresence = usePresenceStore.getState().myPresence;
      if (!currentPresence) return;

      const updatedPresence: UserPresence = {
        ...currentPresence,
        status: updates.status || currentPresence.status,
        currentChannelId:
          updates.channelId !== undefined ? updates.channelId : currentPresence.currentChannelId,
        currentConversationId:
          updates.conversationId !== undefined
            ? updates.conversationId
            : currentPresence.currentConversationId,
        lastSeen: new Date().toISOString(),
      };

      const result = await channelRef.current.track(updatedPresence);

      if (result === 'ok') {
        setMyPresence(updatedPresence);
      }

      return result;
    },
    [setMyPresence],
  );

  const untrackPresence = useCallback(async () => {
    if (!channelRef.current) return;

    const result = await channelRef.current.untrack();
    return result;
  }, []);

  useEffect(() => {
    if (!enabled || !workspaceId || !userId || !workspaceMemberId) {
      return;
    }

    // Use simple channel name
    const presenceChannel = supabase.channel(`presence-${workspaceId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    });

    channelRef.current = presenceChannel;

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const newState = presenceChannel.presenceState();

        const presences: UserPresence[] = [];

        Object.entries(newState).forEach(([key, presenceArray]) => {
          if (Array.isArray(presenceArray) && presenceArray.length > 0) {
            const latestPresence = presenceArray[presenceArray.length - 1];
            // Validate the presence object has required fields
            if (
              latestPresence &&
              typeof latestPresence === 'object' &&
              'userId' in latestPresence &&
              'workspaceMemberId' in latestPresence &&
              'status' in latestPresence &&
              'lastSeen' in latestPresence
            ) {
              presences.push(latestPresence as UserPresence);
            }
          }
        });

        setPresences(presences);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          const latestPresence = newPresences[newPresences.length - 1];
          if (
            latestPresence &&
            typeof latestPresence === 'object' &&
            'userId' in latestPresence &&
            'workspaceMemberId' in latestPresence &&
            'status' in latestPresence &&
            'lastSeen' in latestPresence
          ) {
            setPresence(key, latestPresence as unknown as UserPresence);
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (leftPresences && leftPresences.length > 0) {
          const leftPresence = leftPresences[0];
          if (
            leftPresence &&
            typeof leftPresence === 'object' &&
            'userId' in leftPresence &&
            'workspaceMemberId' in leftPresence &&
            'lastSeen' in leftPresence
          ) {
            setPresence(key, {
              ...(leftPresence as unknown as UserPresence),
              status: 'offline',
            });
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
        }
      });

    // Handle tab visibility
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Don't immediately go away, just track the state
        setTimeout(
          () => {
            if (document.hidden) {
              updatePresence({ status: 'away' });
            }
          },
          5 * 60 * 1000,
        ); // 5 minutes
      } else {
        updatePresence({ status: 'online' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (channelRef.current) {
        const channel = channelRef.current;
        channelRef.current = null; // Clear ref first

        // Untrack presence first, then remove channel
        untrackPresence()
          .then(() => {
            try {
              supabase.removeChannel(channel);
            } catch (error) {
              // Silently handle cleanup errors
            }
          })
          .catch(() => {
            // Silently handle untrack errors
          });
      }

      // Don't clear all presences - other users might still be online!
      // Only clear if this is the last instance
      // clearPresences();
    };
  }, [
    enabled,
    workspaceId,
    userId,
    workspaceMemberId,
    setPresence,
    setPresences,
    clearPresences,
    trackPresence,
    updatePresence,
    untrackPresence,
  ]);

  // Update location when it changes
  useEffect(() => {
    if (channelRef.current && (channelId || conversationId)) {
      updatePresence({ channelId, conversationId });
    }
  }, [channelId, conversationId, updatePresence]);

  return {
    updatePresence,
    untrackPresence,
  };
}

export function useUserPresence(workspaceMemberId: string) {
  const presence = usePresenceStore((state) =>
    state.getPresenceByWorkspaceMemberId(workspaceMemberId),
  );

  return presence;
}
