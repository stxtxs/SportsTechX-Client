'use client';

import { useCallback, useMemo } from 'react';
import { mutate } from 'swr';
import { toast } from 'sonner';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { useCompanyWatchlists, isInvestorList } from './use-company-watchlists';
import { DEFAULT_COMPANY_LIST } from './save-to-watchlist';

/**
 * Pinned watchlists in the left panel (preview fixes, section 3).
 *
 * Up to three, in the order they were pinned, oldest first. The default list
 * (Startup Watchlist on Scout, Investor Watchlist on Raise) counts as pinned
 * until the user unpins something for the first time. Kept on the account
 * (`profiles.dashboard_config.watchlistPins`), so pins follow the user to any
 * device, until the backend has its own field (3.7).
 */
export const MAX_PINNED_WATCHLISTS = 3;
/** Raise's Investor Watchlist is the pipeline board, not a stored list. */
export const INVESTOR_WATCHLIST_ID = 'investor-watchlist';

export interface PinnedWatchlist { id: string; name: string; href: string }

export function useWatchlistPins() {
	const { data: profile, mutate: refetchProfile } = useUserProfile();
	const tier = getUserType(profile);
	const { lists } = useCompanyWatchlists();
	const cfg = (profile?.dashboard_config ?? null) as Record<string, unknown> | null;
	const stored = Array.isArray(cfg?.watchlistPins) ? (cfg!.watchlistPins as string[]) : null;

	// Lists this user has, as the panel can link them.
	const available = useMemo(() => {
		const out: PinnedWatchlist[] = [];
		if (tier === 'raise') out.push({ id: INVESTOR_WATCHLIST_ID, name: 'Investor Watchlist', href: hrefOf('pipeline') });
		for (const l of lists) {
			if (tier !== 'raise' && isInvestorList(l)) continue;
			out.push({ id: l.id, name: l.name, href: `${hrefOf('watchlists')}/${l.id}` });
		}
		return out;
	}, [lists, tier]);

	// Before the first pin or unpin, the default list stands pinned (3.4).
	const ids = useMemo(() => {
		if (stored) return stored;
		if (tier === 'raise') return [INVESTOR_WATCHLIST_ID];
		const def = lists.find((l) => l.name === DEFAULT_COMPANY_LIST && !isInvestorList(l));
		return def ? [def.id] : [];
	}, [stored, tier, lists]);

	// Resolved against the lists that exist, so a deleted list drops out and a
	// renamed one shows its new name straight away (3.5).
	const pins = useMemo(
		() => ids.map((id) => available.find((a) => a.id === id)).filter((p): p is PinnedWatchlist => !!p).slice(0, MAX_PINNED_WATCHLISTS),
		[ids, available],
	);
	const isPinned = useCallback((id: string) => pins.some((p) => p.id === id), [pins]);

	const toggle = useCallback(async (id: string) => {
		const current = pins.map((p) => p.id);
		const pinning = !current.includes(id);
		if (pinning && current.length >= MAX_PINNED_WATCHLISTS) {
			toast('You can pin up to three watchlists. Unpin one to add this.');
			return;
		}
		const next = pinning ? [...current, id] : current.filter((x) => x !== id);
		const res = await apiRequest('PATCH', '/api/me', { dashboard_config: { ...(cfg ?? {}), watchlistPins: next } });
		if (!res.ok) { toast.error("Couldn't update your pinned watchlists. Try again."); return; }
		await Promise.all([refetchProfile(), mutate(qk.profile())]);
	}, [pins, cfg, refetchProfile]);

	return { pins, isPinned, toggle };
}
