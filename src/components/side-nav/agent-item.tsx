import { Bot } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AgentEntity } from '@/features/agents/types';
import { useParamIds } from '@/hooks/use-param-ids';
import { cva, VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import { cn } from '../../lib/utils';

const agentItemVariants = cva(
  'flex items-center gap-1.5 justify-start font-normal h-7 px-2 text-sm overflow-hidden',
  {
    variants: {
      variant: {
        default: 'text-secondary-foreground hover:bg-accent',
        active: 'text-secondary-foreground bg-accent hover:bg-accent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

const AgentItem = ({
  agent,
  variant,
}: {
  agent: AgentEntity;
  variant?: VariantProps<typeof agentItemVariants>['variant'];
}) => {
  const { workspaceId } = useParamIds();
  const router = useRouter();

  const handleAgentClick = () => {
    router.push(`/${workspaceId}/agents/${agent.id}`);
  };

  return (
    <Button variant="ghost" className={cn(agentItemVariants({ variant }))} size="sm" asChild>
      <Link href={`/${workspaceId}/agents/${agent.id}`} onClick={handleAgentClick}>
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
      </Link>
    </Button>
  );
};

export default AgentItem;
