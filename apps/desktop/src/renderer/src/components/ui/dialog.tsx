import { Dialog as DialogPrimitive } from 'radix-ui';
import { createContext, useCallback, useContext, useState } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import { AnimatePresence, fade, m, scaleIn } from '../../lib/motion';
import { cn } from '../../lib/utils';

/**
 * The Radix `Dialog` with the same parts (`Dialog.Root`, `.Portal`, `.Overlay`, `.Content`, `.Title`, …), so a dialog
 * only changes its import, but the scrim fades and the card scales in and out.
 *
 * Radix unmounts a closing dialog at once. Here the parts stay mounted (`forceMount`) and `AnimatePresence` removes
 * them after the exit animation; they learn whether the dialog is open from this context.
 */
const DialogOpenContext = createContext(false);

/** Same props and behaviour as the Radix root; it only also tracks `open` (controlled or not) for the exit animation. */
function Root({
  open: openProp,
  defaultOpen = false,
  onOpenChange,
  ...props
}: ComponentProps<typeof DialogPrimitive.Root>) {
  const [innerOpen, setInnerOpen] = useState(defaultOpen);
  const open = openProp ?? innerOpen;
  const handleOpenChange = useCallback(
    (next: boolean) => {
      setInnerOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );
  return (
    <DialogOpenContext.Provider value={open}>
      <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange} {...props} />
    </DialogOpenContext.Provider>
  );
}

/** Mounts its children only while the dialog is open, plus the time their exit animation takes. */
function Portal({ children }: { children?: ReactNode }) {
  const open = useContext(DialogOpenContext);
  return (
    <DialogPrimitive.Portal forceMount>
      <AnimatePresence>{open ? children : null}</AnimatePresence>
    </DialogPrimitive.Portal>
  );
}

function Overlay({ className, ...props }: Omit<ComponentProps<typeof DialogPrimitive.Overlay>, 'asChild'>) {
  return (
    <DialogPrimitive.Overlay forceMount asChild {...props}>
      <m.div className={className} variants={fade} initial="hidden" animate="visible" exit="hidden" />
    </DialogPrimitive.Overlay>
  );
}

/** The classes that centre a card with CSS; a full-screen flex frame does that here (CSS `translate` fights motion). */
const CENTERING = /(^|\s)(fixed|top-1\/2|left-1\/2|-translate-x-1\/2|-translate-y-1\/2|z-50)(?=\s|$)/g;

/**
 * The card. Give it the same classes as before, including the ones that centre it: they are moved to a frame. The frame
 * ignores the pointer so a click beside the card reaches the scrim, which Radix treats as an outside click.
 */
function Content({ className, children, ...props }: Omit<ComponentProps<typeof DialogPrimitive.Content>, 'asChild'>) {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center">
      <DialogPrimitive.Content forceMount asChild {...props}>
        <m.div
          className={cn('pointer-events-auto', className?.replace(CENTERING, '$1').trim())}
          variants={scaleIn}
          initial="hidden"
          animate="visible"
          exit="hidden"
        >
          {children}
        </m.div>
      </DialogPrimitive.Content>
    </div>
  );
}

export const Dialog = {
  Root,
  Portal,
  Overlay,
  Content,
  Trigger: DialogPrimitive.Trigger,
  Title: DialogPrimitive.Title,
  Description: DialogPrimitive.Description,
  Close: DialogPrimitive.Close,
};
