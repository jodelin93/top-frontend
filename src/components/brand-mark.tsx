import { cn } from '@/lib/utils';

// Cyan, magenta, yellow, key: the four plates of the press
const PLATES = ['var(--process-cyan)', 'var(--process-magenta)', 'var(--process-yellow)'];

/**
 * The registration mark: the four process colours in register. `inverse` draws the
 * key plate in paper colour, for use on ink.
 */
export function RegistrationMark({ inverse = false, className }: { inverse?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn('inline-flex h-4 shrink-0 items-stretch gap-[3px]', className)}>
      {[...PLATES, inverse ? 'var(--paper)' : 'var(--ink)'].map((color) => (
        <span key={color} className="w-[5px] rounded-[1px]" style={{ background: color }} />
      ))}
    </span>
  );
}

/** Registration mark and the Joda POS wordmark */
export function BrandMark({
  inverse = false,
  size = 'md',
  className,
}: {
  inverse?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <RegistrationMark inverse={inverse} className={cn(size === 'lg' && 'h-6 gap-1', size === 'sm' && 'h-3.5')} />
      <span
        className={cn(
          'whitespace-nowrap font-extrabold tracking-[-0.03em]',
          inverse ? 'text-white' : 'text-ink',
          size === 'sm' && 'text-base',
          size === 'md' && 'text-lg',
          size === 'lg' && 'text-2xl'
        )}
      >
        Joda POS
      </span>
    </span>
  );
}
