import { Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgentEntity } from '@/features/agents/types';
import { useParamIds } from '@/hooks/use-param-ids';

const AgentItem = ({ agent }: { agent: AgentEntity }) => {
  const { workspaceId } = useParamIds();
  const router = useRouter();

  const handleAgentClick = () => {
    // Navigate to agent conversations list or create new conversation
    router.push(`/${workspaceId}/agents/${agent.id}`);
  };

  return (
    <Button
      variant="transparent"
      className="w-full justify-start gap-2 h-8"
      onClick={handleAgentClick}
    >
      <Avatar className="size-5">
        <AvatarImage src={agent.avatar_url || undefined} />
        <AvatarFallback>
          <Bot className="size-3" />
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{agent.name}</span>
      <Badge variant="secondary" className="ml-auto text-xs">
        AI
      </Badge>
    </Button>
  );
};

export default AgentItem;
