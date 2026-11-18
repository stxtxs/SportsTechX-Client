'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * Per-user browser state for the benchmark surfaces while their endpoints do
 * not exist (pins, walkthrough, banner dismissals). One store, so Home, the
 * Reports library, the banner and the walkthrough all see the same value the
 * moment one of them writes. Every access is wrapped: storage can be blocked.
 *
 * Once `NEXT_PUBLIC_VC_BENCHMARK_API=1`, the hooks read the API instead and
 * this is only used in mock mode.
 */
const listeners = new Set<() => void>();
const cache = new Map<string, unknown>();

function read<T>(key: string, fallback: T): T {
	if (cache.has(key)) return cache.get(key) as T;
	let value = fallback;
	try {
		const raw = typeof window === 'undefined' ? null : localStorage.getItem(key);
		if (raw) value = JSON.parse(raw) as T;
	} catch { /* blocked or corrupt: fallback */ }
	cache.set(key, value);
	return value;
}

function write<T>(key: string, value: T): void {
	cache.set(key, value);
	try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* in memory only */ }
	listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
	listeners.add(l);
	const onStorage = (e: StorageEvent) => { if (e.key) { cache.delete(e.key); l(); } };
	window.addEventListener('storage', onStorage);
	return () => { listeners.delete(l); window.removeEventListener('storage', onStorage); };
}

/** `[value, set]` for one key. `key: null` (no user yet) returns the fallback. */
export function useLocalValue<T>(key: string | null, fallback: T): [T, (next: T) => void] {
	const value = useSyncExternalStore(
		subscribe,
		() => (key ? read(key, fallback) : fallback),
		() => fallback,
	);
	const set = useCallback((next: T) => { if (key) write(key, next); }, [key]);
	return [value, set];
}
