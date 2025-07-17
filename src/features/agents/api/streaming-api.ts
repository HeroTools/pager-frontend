import { supabase } from '@/lib/supabase/client';

interface StreamingChatData {
  message: string;
  conversationId?: string | null;
  agentId: string;
  workspaceId: string;
}

interface StreamingCallbacks {
  onUserMessage?: (data: any) => void;
  onContentDelta?: (content: string) => void;
  onAgentSwitch?: (agent: string) => void;
  onToolCall?: (toolCall: any) => void;
  onComplete?: (data: any) => void;
  onError?: (error: string) => void;
}

async function getAuthToken(): Promise<string | null> {
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();
  if (error || !session) {
    console.error('[Auth] getSession failed', error);
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const fiveMin = 5 * 60;
  if (session.expires_at && session.expires_at - now < fiveMin) {
    const { data: newSession, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !newSession.session) {
      console.error('[Auth] refreshSession failed', refreshError);
      return null;
    }
    return newSession.session.access_token;
  }

  return session.access_token;
}

export async function streamAgentChat(
  data: StreamingChatData,
  callbacks: StreamingCallbacks,
): Promise<any> {
  const token = await getAuthToken();
  if (!token) {
    throw new Error('No authentication token available');
  }

  const url = `${process.env.NEXT_PUBLIC_STREAMING_API_BASE_URL}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      message: data.message,
      conversationId: data.conversationId,
      agentId: data.agentId,
      workspaceId: data.workspaceId,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new Error('No response body for streaming');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let completeData: any = null;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));

            // Handle different event types based on the previous event line
            const eventMatch = lines[lines.indexOf(line) - 1]?.match(/^event: (.+)$/);
            const event = eventMatch?.[1];

            switch (event) {
              case 'user_message':
                callbacks.onUserMessage?.(data);
                break;
              case 'content_delta':
                callbacks.onContentDelta?.(data.content);
                break;
              case 'agent_switch':
                callbacks.onAgentSwitch?.(data.agent);
                break;
              case 'tool_call':
                callbacks.onToolCall?.(data.toolCall);
                break;
              case 'agent_message_complete':
                completeData = data;
                callbacks.onComplete?.(data);
                break;
              case 'error':
                callbacks.onError?.(data.message || 'Unknown error');
                throw new Error(data.message || 'Stream error');
              case 'done':
                // Stream complete
                break;
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', parseError);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  return completeData;
}
