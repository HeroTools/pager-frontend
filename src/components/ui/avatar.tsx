'use client';

import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';

import { cn } from '@/lib/utils';
import { useUserPresence } from '@/hooks/use-presence';

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  workspaceMemberId?: string;
  showPresence?: boolean;
  presencePosition?: 'bottom-right' | 'top-right' | 'bottom-left' | 'top-left';
  presenceSize?: 'sm' | 'md' | 'lg';
}

const Avatar = React.forwardRef<React.ComponentRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  (
    {
      className,
      workspaceMemberId,
      showPresence = true,
      presencePosition = 'bottom-right',
      presenceSize = 'md',
      children,
      ...props
    },
    ref,
  ) => {
    const presence = useUserPresence(workspaceMemberId || '');
    // Default to offline if no presence data
    const presenceStatus = presence?.status || 'offline';
    const shouldShowPresence = showPresence && workspaceMemberId;

    const presenceSizeClasses = {
      sm: 'h-2 w-2',
      md: 'h-2.5 w-2.5',
      lg: 'h-3 w-3',
    };

    const presencePositionClasses = {
      'bottom-right': 'bottom-0 right-0',
      'top-right': 'top-0 right-0',
      'bottom-left': 'bottom-0 left-0',
      'top-left': 'top-0 left-0',
    };

    const getPresenceClasses = (status: string) => {
      switch (status) {
        case 'online':
          return 'bg-text-success ring-1 ring-text-success/30';
        case 'away':
          return 'bg-text-warning ring-1 ring-text-warning/30';
        case 'offline':
        default:
          return 'bg-text-subtle ring-1 ring-text-subtle/30';
      }
    };

    return (
      <div className="relative inline-block">
        <AvatarPrimitive.Root
          ref={ref}
          className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-md', className)}
          {...props}
        >
          {children}
        </AvatarPrimitive.Root>
        {shouldShowPresence && (
          <span
            className={cn(
              'absolute block rounded-full border-2 border-background',
              presenceSizeClasses[presenceSize],
              presencePositionClasses[presencePosition],
              getPresenceClasses(presenceStatus),
              'transition-colors duration-200',
            )}
            aria-label={`User is ${presenceStatus}`}
          />
        )}
      </div>
    );
  },
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square h-full w-full object-cover', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex h-full w-full items-center justify-center rounded-md bg-primary text-primary-foreground text-sm',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
