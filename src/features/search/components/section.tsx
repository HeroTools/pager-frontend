import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode[] | null | undefined;
}

export const Section = ({ title, children }: SectionProps) => {
  if (!children || !Array.isArray(children) || children.length === 0) {
    return null;
  }

  return (
    <div className="mb-3">
      <div className="text-xs font-semibold text-muted-foreground mb-1 px-2">{title}</div>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
};
