import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-40 cursor-pointer border border-transparent',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 border-primary',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 border',
        ghost: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground border-transparent',
        danger: 'bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive',
        outline: 'bg-transparent text-muted-foreground hover:bg-accent hover:text-accent-foreground border',
        link: 'bg-transparent text-primary hover:text-primary/80 underline-offset-4 hover:underline border-transparent p-0 h-auto',
      },
      size: {
        default: 'h-9 px-4 py-2 text-sm',
        sm: 'h-8 px-3 py-1.5 text-xs',
        lg: 'h-11 px-6 py-3 text-base',
        icon: 'h-9 w-9 p-0',
        iconSm: 'h-8 w-8 p-0',
        iconLg: 'h-11 w-11 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
