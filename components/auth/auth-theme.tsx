'use client';

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

/**
 * The pre-login screens keep their own theme, dark by default.
 *
 * The app's theme lives in next-themes under `stx:theme`; sharing it meant a
 * member who picked light inside the app also got a light login page. Here the
 * auth pages read `stx:auth-theme` instead, and `Providers` hands that to
 * next-themes as `forcedTheme` on these routes only, so the app's own choice is
 * never touched.
 */
export type AuthTheme = 'dark' | 'light';

const STORAGE_KEY = 'stx:auth-theme';
const CHANGE_EVENT = 'stx:auth-theme-change';
const AUTH_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password'];

export const isAuthPath = (pathname: string | null): boolean =>
	!!pathname && AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

function readStored(): AuthTheme {
	try {
		return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark';
	} catch {
		return 'dark'; // Storage blocked (private mode).
	}
}

function subscribe(onChange: () => void): () => void {
	window.addEventListener(CHANGE_EVENT, onChange);
	window.addEventListener('storage', onChange);
	return () => {
		window.removeEventListener(CHANGE_EVENT, onChange);
		window.removeEventListener('storage', onChange);
	};
}

function setTheme(t: AuthTheme): void {
	try {
		localStorage.setItem(STORAGE_KEY, t);
	} catch {
		// Not stored; nothing to switch to either, so stay as is.
		return;
	}
	window.dispatchEvent(new Event(CHANGE_EVENT));
}

interface AuthThemeValue { theme: AuthTheme; setTheme: (t: AuthTheme) => void }

const AuthThemeContext = createContext<AuthThemeValue | null>(null);

/** Dark on the server and during hydration, then the stored choice. */
export function AuthThemeProvider({ children }: { children: ReactNode }) {
	const theme = useSyncExternalStore(subscribe, readStored, () => 'dark' as const);
	const value = useMemo(() => ({ theme, setTheme }), [theme]);
	return <AuthThemeContext.Provider value={value}>{children}</AuthThemeContext.Provider>;
}

export function useAuthTheme(): AuthThemeValue {
	const ctx = useContext(AuthThemeContext);
	if (!ctx) throw new Error('useAuthTheme must be used inside AuthThemeProvider');
	return ctx;
}
