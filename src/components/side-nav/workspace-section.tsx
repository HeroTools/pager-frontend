import { ChevronDown, PlusIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useToggle } from 'react-use';
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
    <div className="flex flex-col mt-3 px-2 gap-1.5">
      <div className="flex items-center px-3.5 group">
        <Button
          variant="transparent"
          className="p-0.5 text-sm text-foreground shrink-0 size-6 hover:bg-secondary/90"
          onClick={toggle}
        >
          <ChevronDown className={cn('size-4 transition-transform', !on && '-rotate-90')} />
        </Button>
        <Button
          variant="transparent"
          size="sm"
          className="group px-1.5 text-sm text-foreground h-[28px] justify-start overflow-hidden items-center hover:bg-secondary/90"
        >
          <span className="truncate">{label}</span>
        </Button>
        {onNew && (
          <Hint label={hint} side="top" align="center">
            <Button
              variant="transparent"
              className="opacity-0 group-hover:opacity-100 transition-opacity ml-auto p-0.5 text-sm text-muted-foreground size-6 shrink-0"
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
