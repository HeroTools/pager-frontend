import type { FC } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Skeleton message component with consistent heights matching real messages
const MessageSkeleton: FC<{ isCompact?: boolean; index?: number }> = ({
  isCompact = false,
  index = 0,
}) => {
  // Create deterministic line patterns based on index
  const hasSecondLine = (index + 1) % 4 !== 0;
  const hasThirdLine = (index + 1) % 7 === 0;

  return (
    <div
      className={cn('px-4 py-1.5 transition-colors duration-100 ease-in-out', {
        'pt-3': !isCompact,
      })}
    >
      <div className="flex gap-3">
        {!isCompact ? (
          <div className="flex-shrink-0">
            <Skeleton className="h-9 w-9 rounded-full" />
          </div>
        ) : (
          <div className="w-9 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          {!isCompact && (
            <div className="flex items-baseline gap-2 mb-0.5">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-3 w-16" />
            </div>
          )}
          <div className={cn('leading-relaxed space-y-1', !isCompact && 'mt-0')}>
            <Skeleton className="h-4 w-full max-w-md" />
            {hasSecondLine && <Skeleton className="h-4 w-3/4 max-w-sm" />}
            {hasThirdLine && <Skeleton className="h-4 w-1/2 max-w-xs" />}
          </div>
        </div>
      </div>
    </div>
  );
};

const SkeletonMessages: FC<{ count: number }> = ({ count }) => {
  const skeletons = [];

  for (let i = 0; i < count; i++) {
    const isCompact = i > 0 && i % 3 !== 0 && i % 5 !== 0;
    skeletons.push(<MessageSkeleton key={`skeleton-${i}`} isCompact={isCompact} index={i} />);
  }

  return <>{skeletons}</>;
};

export { MessageSkeleton, SkeletonMessages };
