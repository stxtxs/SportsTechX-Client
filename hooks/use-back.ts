'use client';

import { useEffect, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';

/**
 * Whether there is an Atlas page behind this one in the tab's history.
 *
 * Counted from client-side route changes since the app loaded in this tab. A
 * profile opened in a new tab, from an email or after a reload has no Atlas
 * page behind it that we know of, so "back" could leave the app — those go to
 * the fallback instead.
 */
const nav = { moves: 0, last: null as string | null };

/** Mounted once in Providers: counts in-app route changes for useBackOr. */
export function NavHistoryTracker() {
  const path = usePathname();
  useEffect(() => {
    if (nav.last !== null && path !== nav.last) nav.moves++;
    nav.last = path;
  }, [path]);
  return null;
}

/**
 * Click handler for a "Return" link: behaves like the browser's back button
 * when the user came here from another Atlas page (a list keeps its filters,
 * because they live in its URL), and otherwise lets the link go to `href` — the
 * list as the user last left it. Modified clicks (new tab) keep the link.
 */
export function useBackOr(): (e: MouseEvent) => void {
  const router = useRouter();
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (nav.moves === 0) return;
    e.preventDefault();
    router.back();
  };
}
