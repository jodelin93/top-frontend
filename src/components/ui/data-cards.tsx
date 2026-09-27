'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

/**
 * Phone layout for the admin lists. Below the md breakpoint a wide table would
 * scroll sideways (status and actions off-screen), so pages render the same rows
 * as stacked cards instead:
 *
 *   const smallScreen = useSmallScreen();
 *   smallScreen ? (
 *     <DataCards items={rows} getKey={(r) => r.id} onItemClick={open} loading={isLoading}
 *       loadingText={loadingText} emptyText={emptyText}>
 *       {(row) => (<>
 *         <DataCardHeader title={row.name} badge={<Badge>...</Badge>} />
 *         <DataCardFields>
 *           <DataCardField label={totalLabel}>{money(row.total)}</DataCardField>
 *         </DataCardFields>
 *         <DataCardActions>...same buttons as the table row...</DataCardActions>
 *       </>)}
 *     </DataCards>
 *   ) : (<Table>...</Table>)
 *
 * Only ONE layout is rendered at a time (never both hidden with CSS), so a control
 * exists once on the page.
 */
// Same breakpoint as Tailwind's md (and the till's two-view layout)
const SMALL_SCREEN = '(max-width: 767.98px)';
// Test environments (jsdom) have no matchMedia: they get the desktop tables
const hasMatchMedia = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

const subscribe = (onChange: () => void) => {
  if (!hasMatchMedia()) return () => undefined;
  const query = window.matchMedia(SMALL_SCREEN);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

/** True on phones (narrower than the md breakpoint): lists render as cards */
export function useSmallScreen(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => hasMatchMedia() && window.matchMedia(SMALL_SCREEN).matches,
    () => false
  );
}

type DataCardsProps<T> = {
  items: readonly T[];
  getKey: (item: T, index: number) => React.Key;
  children: (item: T, index: number) => React.ReactNode;
  /** Same as clicking the table row (open the detail / edit dialog) */
  onItemClick?: (item: T) => void;
  loading?: boolean;
  loadingText?: React.ReactNode;
  emptyText?: React.ReactNode;
  /** Extra classes for one card (e.g. dimmed inactive rows) */
  itemClassName?: (item: T) => string | undefined;
  className?: string;
  'aria-label'?: string;
};

export function DataCards<T>({
  items,
  getKey,
  children,
  onItemClick,
  loading,
  loadingText,
  emptyText,
  itemClassName,
  className,
  'aria-label': ariaLabel,
}: DataCardsProps<T>) {
  if (loading || items.length === 0) {
    return (
      <p className={cn('px-4 py-10 text-center text-sm text-gray-400', className)}>
        {loading ? loadingText : emptyText}
      </p>
    );
  }
  return (
    <ul className={cn('space-y-2 p-3', className)} aria-label={ariaLabel} data-testid="data-cards">
      {items.map((item, index) => (
        <DataCard
          key={getKey(item, index)}
          onClick={onItemClick ? () => onItemClick(item) : undefined}
          className={itemClassName?.(item)}
        >
          {children(item, index)}
        </DataCard>
      ))}
    </ul>
  );
}

/** One card; clicking anywhere outside its buttons / inputs does onClick */
export function DataCard({
  onClick,
  className,
  children,
  as: Tag = 'li',
}: {
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  as?: 'li' | 'div';
}) {
  return (
    <Tag
      onClick={
        onClick
          ? (e: React.MouseEvent) => {
              // Buttons, links and form fields inside the card do their own thing
              if ((e.target as HTMLElement).closest('button, a, input, select, textarea, label')) return;
              onClick();
            }
          : undefined
      }
      className={cn(
        'min-w-0 space-y-2 rounded-lg border bg-white p-3 text-sm',
        onClick && 'cursor-pointer active:bg-gray-50',
        className
      )}
    >
      {children}
    </Tag>
  );
}

/** Top line: the name / number (a real button when the card opens something) and a status badge */
export function DataCardHeader({
  title,
  subtitle,
  badge,
  onTitleClick,
  className,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  onTitleClick?: () => void;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-2', className)}>
      <div className="min-w-0 flex-1">
        <div className="break-words font-medium text-gray-900">
          {onTitleClick ? (
            <button type="button" className="text-left hover:underline" onClick={onTitleClick}>
              {title}
            </button>
          ) : (
            title
          )}
        </div>
        {subtitle && <div className="break-words text-xs text-gray-500">{subtitle}</div>}
      </div>
      {badge && <div className="flex shrink-0 flex-wrap justify-end gap-1">{badge}</div>}
    </div>
  );
}

/** Key values as a two-column label / value grid */
export function DataCardFields({ className, children }: { className?: string; children: React.ReactNode }) {
  return <dl className={cn('grid grid-cols-2 gap-x-3 gap-y-1.5', className)}>{children}</dl>;
}

export function DataCardField({
  label,
  children,
  full,
  className,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  /** Take the whole width (long text) */
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', full && 'col-span-2', className)}>
      <dt className="text-xs text-gray-500">{label}</dt>
      <dd className="break-words text-gray-900">{children}</dd>
    </div>
  );
}

/** Row actions, wrapping onto more lines instead of widening the card */
export function DataCardActions({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('flex flex-wrap items-center justify-end gap-2 border-t pt-2', className)}>{children}</div>;
}
