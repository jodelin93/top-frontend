'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { CircleHelp, ExternalLink, X } from 'lucide-react';
import { t } from '@/i18n';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { HelpView } from './help-view';
import { useHelpStore } from './store';

// Screens where help is not offered (the customer-facing display)
const NO_HELP = ['/customer-display', '/help'];

/**
 * Help drawer (right side on desktop, full screen on phones) and the F1 shortcut.
 * Mounted once for the whole app (providers.tsx).
 */
export function HelpRoot() {
  const pathname = usePathname() ?? '';
  const disabled = NO_HELP.some((path) => pathname.startsWith(path));

  useEffect(() => {
    if (disabled) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'F1' || event.altKey || event.ctrlKey || event.metaKey) return;
      event.preventDefault();
      const { open, openHelp, close } = useHelpStore.getState();
      if (open) close();
      else openHelp();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [disabled]);

  if (disabled) return null;
  return <HelpDrawer />;
}

function HelpDrawer() {
  const { open, topicId, scope, query, location, close, showTopic, back, setQuery, setScope } = useHelpStore();

  const fullPage = topicId ? `/help/${topicId}` : '/help';

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => (next ? undefined : close())}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/20" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onEscapeKeyDown={(event) => {
            // Escape first closes an enlarged picture
            const zoom = document.querySelector<HTMLElement>('[data-help-zoom]');
            if (zoom) {
              event.preventDefault();
              zoom.click();
            }
          }}
          className={cn(
            'fixed inset-y-0 right-0 z-[60] flex w-full flex-col bg-gray-50 shadow-2xl outline-none',
            'sm:w-[440px] sm:border-l lg:w-[480px]',
            'h-dvh'
          )}
          data-testid="help-drawer"
        >
          <div className="flex h-14 shrink-0 items-center gap-2 border-b bg-white px-3">
            <CircleHelp className="h-5 w-5 text-blue-600" aria-hidden />
            <DialogPrimitive.Title className="flex-1 text-base font-semibold">{t('Help')}</DialogPrimitive.Title>
            <Button variant="ghost" size="sm" asChild className="h-9 text-gray-600">
              <Link href={fullPage} onClick={close} title={t('Open the help in a full page')}>
                <ExternalLink className="h-4 w-4" />
                <span className="max-sm:sr-only">{t('Full page')}</span>
              </Link>
            </Button>
            <DialogPrimitive.Close
              className="flex h-10 w-10 items-center justify-center rounded-md text-gray-600 hover:bg-gray-100"
              aria-label={t('Close the help')}
            >
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          {open && (
            <HelpView
              className="flex-1"
              topicId={topicId}
              query={query}
              onQuery={setQuery}
              onOpenTopic={showTopic}
              onBack={back}
              onLeave={close}
              location={location}
              scope={scope}
              onScope={setScope}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * "Help" button for headers and menus. `topicId` forces a topic; by default the drawer
 * shows the topic of what is on screen.
 */
export function HelpButton({
  topicId,
  label = false,
  className,
  variant = 'ghost',
  onOpen,
}: {
  topicId?: string;
  /** Show the text next to the icon */
  label?: boolean;
  className?: string;
  variant?: 'ghost' | 'outline';
  /** Called before opening (e.g. to close a menu) */
  onOpen?: () => void;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={label ? 'sm' : 'icon'}
      className={className}
      onClick={() => {
        onOpen?.();
        useHelpStore.getState().openHelp(topicId);
      }}
      title={t('Help (F1)')}
      aria-label={label ? undefined : t('Help')}
      data-testid="help-button"
    >
      <CircleHelp className="h-4 w-4" />
      {label && t('Help')}
    </Button>
  );
}

/** Small "Need help?" link for the sign-in pages: opens the drawer on a topic */
export function HelpLink({ topicId, className }: { topicId: string; className?: string }) {
  return (
    <button
      type="button"
      onClick={() => useHelpStore.getState().openHelp(topicId)}
      className={cn('inline-flex items-center gap-1 text-sm text-gray-600 hover:text-blue-700 hover:underline', className)}
      data-testid="help-link"
    >
      <CircleHelp className="h-4 w-4" aria-hidden />
      {t('Need help?')}
    </button>
  );
}
