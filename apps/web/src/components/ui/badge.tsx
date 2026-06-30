import { cn } from '@/lib/utils';

export function Badge({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-sm border border-border bg-surface px-2 py-0.5 font-mono text-[0.6875rem] font-medium tracking-wide text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}
