import type { ComponentProps } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1.5 [&>svg]:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 transition-all duration-150 overflow-hidden',
  {
    variants: {
      variant: {
        primary: 'border-primary bg-primary text-primary-foreground [a&]:hover:bg-primary/90',
        secondary: 'border bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/80',
        success: 'border-accent-success bg-accent-success text-white [a&]:hover:bg-accent-success/90',
        danger: 'border-destructive bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        warning: 'border-accent-warning bg-accent-warning text-white [a&]:hover:bg-accent-warning/90',
        outline: 'border bg-transparent text-muted-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground',
      },
    },
    defaultVariants: {
      variant: 'primary',
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span';

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
