'use client';

import { useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { clearAuthCookies } from '@/lib/supabase/clear-auth-cookies';
import { logoutState } from '@/lib/logout-state';
import { disableQueryPolling } from '@/lib/query-client';
import { track, Events } from '@/lib/analytics';

/** Longest we wait on Supabase's server-side sign-out before leaving anyway. */
const SIGN_OUT_WAIT_MS = 3000;

/**
 * Signing out, in one place (account settings, the navbar menu and the rail
 * account card all use this).
 *
 * Order matters:
 *  1. Announce the logout (`logoutState.startLogout()`) and stop the SWR
 *     fetcher (`disableQueryPolling()`). Without this, requests still in flight
 *     got a 401 once the session was revoked, and the 401 handler and session
 *     monitor (which stand down only when `isLoggingOut()`) treated it as an
 *     EXPIRED session: "Redirecting…", a long wait, then a hard reload to
 *     /login?reason=session_expired.
 *  2. Revoke the session at Supabase, waiting at most SIGN_OUT_WAIT_MS: a slow
 *     auth call no longer holds the visitor on a spinner.
 *  3. Drop the sb-* cookies ourselves, so the edge middleware can't see a live
 *     cookie and bounce /login back into the app.
 *  4. One full page load to /login: no race with ProtectedRoute's own soft
 *     redirect, and every in-memory cache (SWR, chat, realtime) is gone.
 *
 * `signingOut` stays true on the success path: the page load ends this
 * component's life. It is only reset on failure.
 */
export function useLogout(): { logout: () => Promise<void>; signingOut: boolean } {
	const [signingOut, setSigningOut] = useState(false);

	const logout = async () => {
		if (signingOut) return;
		setSigningOut(true);
		try {
			logoutState.startLogout();
			disableQueryPolling();
			track(Events.signedOut);
			await Promise.race([
				getSupabaseBrowser().auth.signOut().catch(() => undefined),
				new Promise((resolve) => setTimeout(resolve, SIGN_OUT_WAIT_MS)),
			]);
			clearAuthCookies();
			window.location.replace('/login');
		} catch {
			setSigningOut(false);
		}
	};

	return { logout, signingOut };
}
