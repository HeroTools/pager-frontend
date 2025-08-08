import { supabase } from '@/lib/supabase/client';
import { usePresenceStore, type UserPresence } from '@/stores/presence-store';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useCallback, useEffect, useRef } from 'react';

const isValidPresence = (data: unknown): data is UserPresence => {
  return (
    data !== null &&
    typeof data === 'object' &&
    'userId' in data &&
    'workspaceMemberId' in data &&
    'status' in data &&
    'lastSeen' in data
  );
};

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { setPresence, setPresences, setMyPresence } = usePresenceStore();

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
            if (isValidPresence(latestPresence)) {
              presences.push(latestPresence);
            }
          }
        });

        setPresences(presences);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        if (newPresences && newPresences.length > 0) {
          const latestPresence = newPresences[newPresences.length - 1];
          if (isValidPresence(latestPresence)) {
            setPresence(key, latestPresence);
          }
        }
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        if (leftPresences && leftPresences.length > 0) {
          const leftPresence = leftPresences[0];
          // For leave events, we might not have the full data
          const basePresence = leftPresence as Partial<UserPresence>;
          if (basePresence?.userId && basePresence?.workspaceMemberId) {
            setPresence(key, {
              userId: basePresence.userId,
              workspaceMemberId: basePresence.workspaceMemberId,
              status: 'offline',
              lastSeen: basePresence.lastSeen || new Date().toISOString(),
              currentChannelId: basePresence.currentChannelId,
              currentConversationId: basePresence.currentConversationId,
            });
          }
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await trackPresence();
        }
      });

    const handleVisibilityChange = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (document.hidden) {
        timeoutRef.current = setTimeout(
          () => {
            if (document.hidden) {
              updatePresence({ status: 'away' });
            }
            timeoutRef.current = null;
          },
          5 * 60 * 1000,
        );
      } else {
        updatePresence({ status: 'online' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      if (channelRef.current) {
        const channel = channelRef.current;
        channelRef.current = null;

        untrackPresence()
          .then(() => supabase.removeChannel(channel))
          .catch(() => {
            // Silently handle cleanup errors
          });
      }
    };
  }, [
    enabled,
    workspaceId,
    userId,
    workspaceMemberId,
    setPresence,
    setPresences,
    trackPresence,
    updatePresence,
    untrackPresence,
  ]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (channelRef.current && (channelId || conversationId)) {
        updatePresence({ channelId, conversationId });
      }
    }, 500);

    return () => clearTimeout(timer);
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

export function useIsUserOnline(workspaceMemberId: string): boolean {
  const presence = useUserPresence(workspaceMemberId);
  return presence?.status === 'online';
}
