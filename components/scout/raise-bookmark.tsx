'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Bookmark } from 'lucide-react';
import { Action, cx } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths } from '@/lib/invalidate';
import { hrefOf } from '@/lib/routes';
import type { DealRow } from './deal-types';

/** Where saved raises are listed, inside Watchlists. */
export const SAVED_RAISES_HREF = `${hrefOf('watchlists')}/raises`;

/**
 * Save a raise (Deal Flow 6.8, preview fixes 2): the bookmark on every raise
 * card and on the raise page. Saved raises show in Watchlists as "Saved
 * raises". Until raises can go into named watchlists (6.8, Backend), the save
 * is kept by the API's per-raise watch (`/scout/dealflow/:id/watch`).
 */
export function RaiseBookmark({ d, variant = 'icon' }: { d: DealRow; variant?: 'icon' | 'action' }) {
	const [saved, setSaved] = useState<boolean | null>(null);
	const [busy, setBusy] = useState(false);
	const on = saved ?? !!d.is_watched;

	const toggle = async () => {
		setBusy(true);
		const next = !on;
		setSaved(next);
		try {
			const res = await apiRequest(next ? 'PUT' : 'DELETE', `/api/scout/dealflow/${d.id}/watch`);
			if (!res.ok) throw new Error(String(res.status));
			void refreshPaths('/api/scout/dealflow');
			if (next) toast.success('Saved to Watchlists.', { action: { label: 'View', onClick: () => window.location.assign(SAVED_RAISES_HREF) } });
			else toast('Removed from Watchlists.');
		} catch {
			setSaved(!next);
			toast.error("Couldn't save this raise. Please try again.");
		} finally { setBusy(false); }
	};

	const label = on ? 'Saved' : 'Save to watchlist';
	if (variant === 'action') {
		return <Action icon={<Bookmark fill={on ? 'currentColor' : 'none'} />} onClick={() => void toggle()} disabled={busy}>{label}</Action>;
	}
	return (
		<button type="button" className={cx('atlas-feed-card__pin scout-raise__save', on && 'is-on')} aria-pressed={on} aria-label={label} title={label} disabled={busy} onClick={() => void toggle()}>
			<Bookmark size={14} strokeWidth={1.75} fill={on ? 'currentColor' : 'none'} aria-hidden="true" />
		</button>
	);
}

