'use client';

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';
import { useCompanyWatchlists, isInvestorList } from './use-company-watchlists';
import { setWatchlistPins, useWatchlistSettings } from './use-watchlist-settings';

/**
 * Pinned watchlists in the left panel (preview fixes, section 3).
 *
 * Up to three, in the order they were pinned, oldest first. The default list
 * (Startup Watchlist on Scout, Investor Watchlist on Raise) counts as pinned
 * until the user unpins something for the first time; the server answers that
 * (`/api/watchlist-settings`, 3.7), so pins follow the user to any device.
 */
export const MAX_PINNED_WATCHLISTS = 3;
/** Raise's Investor Watchlist is the pipeline board, not a stored list. */
export const INVESTOR_WATCHLIST_ID = 'investor-watchlist';

export interface PinnedWatchlist { id: string; name: string; href: string }

export function useWatchlistPins() {
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const { lists } = useCompanyWatchlists();
	const { settings, investorListName } = useWatchlistSettings();
	const ids = settings?.pins;

	// Lists this user has, as the panel can link them.
	const available = useMemo(() => {
		const out: PinnedWatchlist[] = [];
		if (tier === 'raise') out.push({ id: INVESTOR_WATCHLIST_ID, name: investorListName, href: hrefOf('pipeline') });
		for (const l of lists) {
			if (tier !== 'raise' && isInvestorList(l)) continue;
			out.push({ id: l.id, name: l.name, href: `${hrefOf('watchlists')}/${l.id}` });
		}
		return out;
	}, [lists, tier, investorListName]);

	// Resolved against the lists that exist, so a deleted list drops out and a
	// renamed one shows its new name straight away (3.5).
	const pins = useMemo(
		() => (ids ?? []).map((id) => available.find((a) => a.id === id)).filter((p): p is PinnedWatchlist => !!p).slice(0, MAX_PINNED_WATCHLISTS),
		[ids, available],
	);
	const isPinned = useCallback((id: string) => pins.some((p) => p.id === id), [pins]);

	const toggle = useCallback(async (id: string) => {
		// The save replaces the whole set; before the pins have loaded it would wipe the others.
		if (!settings) { toast("Your watchlists are still loading. Try again in a moment."); return; }
		const current = pins.map((p) => p.id);
		const pinning = !current.includes(id);
		if (pinning && current.length >= MAX_PINNED_WATCHLISTS) {
			toast('You can pin up to three watchlists. Unpin one to add this.');
			return;
		}
		const next = pinning ? [...current, id] : current.filter((x) => x !== id);
		if (!(await setWatchlistPins(next))) toast.error("Couldn't update your pinned watchlists. Try again.");
	}, [pins, settings]);

	return { pins, isPinned, toggle };
}
