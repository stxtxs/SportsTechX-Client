'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { hrefOf } from '@/lib/routes';
import { Button } from '@/components/atlas';
import { FLAGS } from './config';
import { useWalkthroughState } from './use-benchmark';
import { openWalkthrough } from './walkthrough';
import './benchmark.css';

/**
 * One dismissible banner at the top of the app, at most one at a time.
 *
 * `useAnnouncements` returns every announcement that currently applies, in
 * priority order; only the first renders. Add a future announcement by adding
 * an entry there — the component does not change. Dismissal is per user
 * (the walkthrough state's `dismissed_banners`).
 */
export interface Announcement {
	id: string;
	text: ReactNode;
	action?: { label: string; onClick: () => void };
}

const TOUR_BANNER = 'walkthrough-2026';

function useAnnouncements(): { list: Announcement[]; dismiss: (id: string) => void } {
	const { ready, state, dismissBanner } = useWalkthroughState();
	const list: Announcement[] = [];
	// Users who skipped, and existing users who never ran it — never on a first login.
	if (FLAGS.walkthrough && ready && !state.first_login && (state.status === 'skipped' || state.status === 'not_started')) {
		list.push({
			id: TOUR_BANNER,
			text: <><strong>New on Atlas:</strong> a two-minute tour of what’s here, ending with setting up your thesis.</>,
			action: { label: 'Take the tour', onClick: openWalkthrough },
		});
	}
	return { list: list.filter((a) => !state.dismissed_banners.includes(a.id)), dismiss: dismissBanner };
}

export function AnnouncementBanner() {
	const { list, dismiss } = useAnnouncements();
	// The "New on Atlas" tour banner shows on Home only (handover v1 §4 Home).
	const onHome = usePathname() === hrefOf('home');
	const a = list[0];
	if (!a || !onHome) return null;
	return (
		<div className="bm-banner-wrap">
			<div className="bm-banner" role="status">
				<span className="bm-banner__text">{a.text}</span>
				{a.action && <Button size="sm" onClick={a.action.onClick}>{a.action.label}</Button>}
				<button type="button" className="bm-banner__close" aria-label="Dismiss" onClick={() => dismiss(a.id)}><X size={14} /></button>
			</div>
		</div>
	);
}
