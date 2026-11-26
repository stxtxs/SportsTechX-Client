'use client';

import useSWR, { mutate } from 'swr';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';

/**
 * Per-account watchlist settings (`/api/watchlist-settings`): the pinned lists, oldest
 * pin first, and Raise's main Investor Watchlist, which has no list row of its own.
 * Until the user first pins or unpins, the server returns the default list as pinned.
 */
export interface WatchlistSettings {
	pins: string[];
	investor_watchlist: { name: string; view_mode: 'list' | 'board' };
}

export const DEFAULT_INVESTOR_LIST = 'Investor Watchlist';

export function useWatchlistSettings() {
	const { data, isLoading } = useSWR<WatchlistSettings>(qk.userWatchlists.settings());
	return { settings: data, isLoading, investorListName: data?.investor_watchlist.name ?? DEFAULT_INVESTOR_LIST };
}

/** Writes a setting optimistically; rolls back and returns false when the server refuses. */
async function write(path: string, method: 'PUT' | 'PATCH', body: unknown, optimistic: (s: WatchlistSettings) => WatchlistSettings): Promise<boolean> {
	const key = qk.userWatchlists.settings();
	try {
		await mutate<WatchlistSettings>(key, async () => {
			const res = await apiRequest(method, `/api/watchlist-settings/${path}`, body);
			return (await res.json()) as WatchlistSettings;
		}, { optimisticData: (s) => (s ? optimistic(s) : (s as unknown as WatchlistSettings)), rollbackOnError: true, revalidate: false });
		return true;
	} catch {
		return false;
	}
}

export const setWatchlistPins = (keys: string[]) =>
	write('pins', 'PUT', { keys }, (s) => ({ ...s, pins: keys }));

export const updateInvestorWatchlist = (patch: { name?: string; view_mode?: 'list' | 'board' }) =>
	write('investor-watchlist', 'PATCH', patch, (s) => ({ ...s, investor_watchlist: { ...s.investor_watchlist, ...patch } }));
