import { m, transition } from '../../lib/motion';

/**
 * The accent line under the active tab. It slides from the previously active tab of the same list, so give each tab
 * list its own `layoutId`. Put it in a `relative` tab whose bottom border is 2px (it covers that border).
 */
export function TabUnderline({ layoutId }: { layoutId: string }) {
  return (
    <m.span
      layoutId={layoutId}
      transition={transition.layout}
      aria-hidden
      className="absolute inset-x-0 -bottom-0.5 h-0.5 bg-primary"
    />
  );
}
