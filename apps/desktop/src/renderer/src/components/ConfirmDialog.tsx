import { AlertDialog } from 'radix-ui';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, fade, m, scaleIn } from '../lib/motion';
import { Button } from './ui/button';

/** Asks before a destructive action; `onConfirm` runs when the user agrees. */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      {/* Scrim and card stay mounted (`forceMount`) until AnimatePresence has played their exit. */}
      <AlertDialog.Portal forceMount>
        <AnimatePresence>
          {open ? (
            <AlertDialog.Overlay key="overlay" forceMount asChild>
              <m.div
                className="fixed inset-0 z-40 bg-ctp-crust/70 backdrop-blur-sm"
                variants={fade}
                initial="hidden"
                animate="visible"
                exit="hidden"
              />
            </AlertDialog.Overlay>
          ) : null}
          {open ? (
            // A full-screen flex frame centres the card, so no CSS `translate` fights the motion transform.
            <div key="frame" className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
              <AlertDialog.Content forceMount asChild>
                <m.div
                  className="pointer-events-auto flex w-[min(28rem,90vw)] flex-col gap-3 rounded-xl border bg-popover p-5 shadow-2xl"
                  variants={scaleIn}
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                >
                  <AlertDialog.Title className="text-base font-semibold">{title}</AlertDialog.Title>
                  <AlertDialog.Description className="text-muted-foreground">{description}</AlertDialog.Description>
                  <div className="mt-2 flex justify-end gap-2">
                    <AlertDialog.Cancel asChild>
                      <Button variant="ghost">{t('common.cancel')}</Button>
                    </AlertDialog.Cancel>
                    <AlertDialog.Action asChild>
                      <Button
                        variant={destructive ? 'destructive' : 'default'}
                        className={destructive ? 'bg-destructive/10' : undefined}
                        onClick={onConfirm}
                      >
                        {confirmLabel}
                      </Button>
                    </AlertDialog.Action>
                  </div>
                </m.div>
              </AlertDialog.Content>
            </div>
          ) : null}
        </AnimatePresence>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
