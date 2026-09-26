'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { POS_SHORTCUTS } from './use-pos-shortcuts';
import { t } from '@/i18n';

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('Keyboard shortcuts')}</DialogTitle>
          <DialogDescription>{t('After each action the cursor goes back to the search box, ready to scan.')}</DialogDescription>
        </DialogHeader>
        <dl className="divide-y text-sm">
          {POS_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.label} className="flex items-center justify-between gap-4 py-2">
              <dt>{t(shortcut.label)}</dt>
              <dd className="flex gap-1">
                {shortcut.keys.map((key) => (
                  <kbd key={key} className="rounded border bg-gray-50 px-2 py-0.5 font-mono text-xs shadow-sm">
                    {key}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
