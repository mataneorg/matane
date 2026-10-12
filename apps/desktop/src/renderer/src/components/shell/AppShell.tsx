import { Outlet, useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';
import { CommandPalette } from '../../features/palette/CommandPalette';
import { WhatsNewDialog } from '../../features/whats-new/WhatsNewDialog';
import { fadeUp, m } from '../../lib/motion';
import { usePalette } from '../../stores/palette';
import { Sidebar } from './Sidebar';
import { TitleBar } from './TitleBar';

export function AppShell() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  // Ctrl+K (⌘K on macOS) opens the command palette anywhere in the app shell, or closes it.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        const palette = usePalette.getState();
        palette.setOpen(!palette.open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        {/* Keyed by the path so a new page starts at the top and fades in; pages that restore a position do it after they mount. */}
        <m.main
          key={pathname}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          className="min-w-0 flex-1 overflow-auto"
        >
          <Outlet />
        </m.main>
      </div>
      <CommandPalette />
      <WhatsNewDialog />
    </div>
  );
}
