import type { MouseEvent } from "react";
import { useRouteTransition } from "./RouteTransition";

/**
 * `onClick` for a plain link that should play the hat transition instead of an
 * instant page change. Modified clicks (new tab, etc.) keep native behaviour.
 *
 *   <Link href={href} onClick={transitionClick(href)}>
 */
export function useTransitionLink() {
  const { navigate } = useRouteTransition();

  return (href: string) => (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    navigate(href);
  };
}
