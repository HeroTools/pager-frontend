import { useParamIds } from '@/hooks/use-param-ids';
import { useParams } from 'next/navigation';

// This would be your page component at: /[workspaceId]/agents/[agentId]/conversations/[conversationId]
export default function AgentConversationPage() {
  const { workspaceId } = useParamIds();
  const params = useParams();
  const agentId = params.agentId as string;
  const conversationId = params.conversationId as string;

  if (!workspaceId || !agentId || !conversationId) {
    return <div>Loading...</div>;
  }

  return <h1>Agent Conversation</h1>;
}
