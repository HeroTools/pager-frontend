import { ChevronDown, PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useToggle } from '@/hooks/use-toggle';
import { Hint } from '@/components/hint';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface WorkspaceSectionProps {
  children: ReactNode;
  label: string;
  hint: string;
  onNew?: () => void;
}

export const WorkspaceSection = ({ children, hint, label, onNew }: WorkspaceSectionProps) => {
  const [on, toggle] = useToggle(true);

  return (
    <div className="flex flex-col mt-3 px-2 gap-2">
      <div className="flex items-center px-2 group">
        <Button
          variant="ghost"
          className="p-1 text-sm text-foreground shrink-0 size-6 hover:bg-accent"
          onClick={toggle}
        >
          <ChevronDown className={cn('size-4 transition-transform', !on && '-rotate-90')} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="group px-2 text-sm text-foreground h-7 justify-start overflow-hidden items-center hover:bg-accent"
        >
          <span className="truncate">{label}</span>
        </Button>
        {onNew && (
          <Hint label={hint} side="top" align="center">
            <Button
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 hover:bg-accent transition-opacity ml-auto p-1 text-sm text-muted-foreground size-6 shrink-0"
              onClick={onNew}
            >
              <PlusIcon className="size-4" />
            </Button>
          </Hint>
        )}
      </div>
      {on && children}
    </div>
  );
};
