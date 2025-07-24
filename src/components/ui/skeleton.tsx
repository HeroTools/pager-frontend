import { cn } from '@/lib/utils/index';

function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      className={cn('bg-muted animate-pulse rounded-lg', className)}
      {...props}
    />
  );
}

export { Skeleton };
