'use client';

import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import { companyLabel, type DealRow } from './deal-types';

/**
 * Save a raise (Deal Flow 6.8): the bookmark on every raise card and on the raise page. Raises go
 * into the user's watchlists like companies (same menu: tick lists, or create one), and show on
 * those lists' pages. `is_watched` on the row = in at least one of the user's watchlists.
 */
export function RaiseBookmark({ d, variant = 'icon' }: { d: DealRow; variant?: 'icon' | 'action' }) {
	return <SaveToWatchlist raiseId={d.id} companyId="" companyName={companyLabel(d)} compact={variant === 'icon'} saved={!!d.is_watched} />;
}
