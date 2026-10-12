import { type VariantProps, cva } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/utils';

export const badgeVariants = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-[11px] leading-none font-medium whitespace-nowrap [&_svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-input bg-muted text-foreground',
        outline: 'text-muted-foreground',
        primary: 'border-primary/40 bg-primary/15 text-primary-text',
        success: 'border-ctp-green/40 bg-ctp-green/10 text-success-text',
        warning: 'border-ctp-peach/40 bg-ctp-peach/10 text-warning-text',
        danger: 'border-ctp-red/40 bg-ctp-red/10 text-danger-text',
        info: 'border-ctp-blue/40 bg-ctp-blue/10 text-info-text',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export function Badge({ className, variant, ...props }: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
