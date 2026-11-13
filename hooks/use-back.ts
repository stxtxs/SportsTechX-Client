'use client';

import { useEffect, type MouseEvent } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { isAuthPath } from '@/components/auth/auth-theme';

/**
 * Whether the history entry behind this page is an Atlas page we can go back to.
 *
 * True only when this page was reached by an in-app link from a non-auth page.
 * Everything else falls back to the link's href (the list):
 * - opened directly (new tab, email, search, reload) — nothing of ours behind it;
 * - reached by the browser's back/forward (popstate) — what sits behind this
 *   entry is unknown, and it may be outside Atlas;
 * - reached from /login after sign-in — "back" would be the login page.
 */
const nav = { last: null as string | null, popped: false, canBack: false };

/** Mounted once in Providers: records how the current page was reached. */
export function NavHistoryTracker() {
  const path = usePathname();
  useEffect(() => {
    const onPop = () => { nav.popped = true; };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  useEffect(() => {
    // popstate fires before the router commits the new pathname, so `popped`
    // is already set when this runs for a back/forward move.
    if (path !== nav.last) nav.canBack = nav.last !== null && !nav.popped && !isAuthPath(nav.last);
    nav.popped = false;
    nav.last = path;
  }, [path]);
  return null;
}

/**
 * Click handler for a "Return" link: the browser's back when the user came here
 * from another Atlas page (a list keeps its filters, because they live in its
 * URL); otherwise the link goes to its `href` — the list as the user last left
 * it. Modified clicks (new tab) always keep the link.
 */
export function useBackOr(): (e: MouseEvent) => void {
  const router = useRouter();
  return (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    if (!nav.canBack) return;
    e.preventDefault();
    router.back();
  };
}
