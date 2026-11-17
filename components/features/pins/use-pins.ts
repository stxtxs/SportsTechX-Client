'use client';

import { useCallback, useMemo } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { useUserProfile } from '@/hooks/use-user-profile';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { Events, track } from '@/lib/analytics';
import { useLocalValue } from '@/components/features/benchmark/local-store';
import { EMPTY_PINS, MAX_PINS, PIN_LIMIT_MESSAGE, addPin, homePins, removePin, type Pin, type PinState, type PinTarget } from './rules';

/**
 * Pin to Home (fix brief N1, 17 Nov).
 *
 * Until the backend ships `/api/home/pins`, pins are kept in this browser, per
 * user, and the SportsTechX pins below stand in for the admin's "pin for
 * everyone". With `NEXT_PUBLIC_PINS_API=1` the same hook reads and writes the
 * API instead (contract: Notion › Atlas: dev handover › section 11, C2):
 *
 *   GET    /api/home/pins          → { data: Pin[] }  Home's list: newest first,
 *                                    at most four, SportsTechX pins included
 *   POST   /api/home/pins          ← PinTarget         409 at four pins
 *   DELETE /api/home/pins/:key                         a SportsTechX pin stays
 *                                                      unpinned for this user
 */
const USE_API = process.env.NEXT_PUBLIC_PINS_API === '1';

/** Stand-in for the admin's "pin for everyone" (fix brief N1): the Football Tech report. */
export const ATLAS_PINS: readonly Pin[] = [{
	key: 'report:ftabr26',
	kind: 'report',
	title: 'Football Tech & Business Report 2026',
	body: 'The companies, money and people shaping football’s business and technology.',
	href: '/reports/ftabr26',
	newTab: true,
	pinned_at: '2026-11-17T00:00:00.000Z',
	by_atlas: true,
}];

export interface PinsApi {
	/** Home's pinned items, newest first, at most four. */
	pins: Pin[];
	isPinned: (key: string) => boolean;
	/** False when refused (the four-pin cap) or the save failed. */
	pin: (target: PinTarget) => Promise<boolean>;
	unpin: (key: string) => Promise<boolean>;
}

export function usePins(): PinsApi {
	const { data: profile } = useUserProfile();
	const [state, setState] = useLocalValue<PinState>(!USE_API && profile ? `stx-pins:v1:${profile.id}` : null, EMPTY_PINS);
	const api = useSWR<{ data: Pin[] }>(USE_API && profile ? qk.benchmark.homePins() : null, { shouldRetryOnError: false });

	const pins = useMemo(() => (USE_API ? api.data?.data ?? [] : homePins(state, ATLAS_PINS)), [state, api.data]);
	const keys = useMemo(() => new Set(pins.map((p) => p.key)), [pins]);
	const { mutate } = api;

	const pin = useCallback(async (target: PinTarget) => {
		if (keys.has(target.key)) return true;
		if (pins.length >= MAX_PINS) { toast(PIN_LIMIT_MESSAGE); return false; }
		if (USE_API) {
			try { await apiRequest('POST', '/api/home/pins', target); await mutate(); }
			catch { toast.error('Couldn’t pin that. Try again.'); return false; }
		} else {
			const result = addPin(state, target, ATLAS_PINS, new Date().toISOString());
			if (!result.ok) { toast(PIN_LIMIT_MESSAGE); return false; }
			setState(result.state);
		}
		track(Events.pinAdded, { key: target.key });
		return true;
	}, [keys, pins.length, state, setState, mutate]);

	const unpin = useCallback(async (key: string) => {
		if (USE_API) {
			try { await apiRequest('DELETE', `/api/home/pins/${encodeURIComponent(key)}`); await mutate(); }
			catch { toast.error('Couldn’t unpin that. Try again.'); return false; }
		} else {
			setState(removePin(state, key, ATLAS_PINS));
		}
		track(Events.pinRemoved, { key });
		return true;
	}, [state, setState, mutate]);

	const isPinned = useCallback((key: string) => keys.has(key), [keys]);
	return { pins, isPinned, pin, unpin };
}
