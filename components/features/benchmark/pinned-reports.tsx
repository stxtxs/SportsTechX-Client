'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Pin, X } from 'lucide-react';
import { FeedCard } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import { ENTRY_PATH, ENTRY_TITLE, FLAGS } from './config';
import { useHomePins } from './use-benchmark';
import type { HomePin } from './types';
import './benchmark.css';

/** What each pin says. Reuses the "Latest from Atlas" card (label, title, one line, action). */
export const PIN_CARD: Record<HomePin['entry'], { tag: string; title: string; body: string; action: string; href: string; mine?: boolean }> = {
	r3: { tag: 'Your benchmark', title: ENTRY_TITLE.r3, body: 'Your fund’s deal sourcing against the 2026 benchmark, and the gaps worth closing.', action: 'Open', href: ENTRY_PATH.r3, mine: true },
	r2: { tag: 'Report', title: ENTRY_TITLE.r2, body: 'How sports tech investors find, screen and close deals, and where the gaps are.', action: 'Open', href: ENTRY_PATH.r2 },
	r1: { tag: 'Report', title: ENTRY_TITLE.r2, body: 'How sports tech investors find, screen and close deals, and where the gaps are.', action: 'Open', href: ENTRY_PATH.r1 },
	ftr: { tag: 'Report', title: 'Football Tech & Business Report 2026', body: 'The companies, money and people shaping football’s business and technology.', action: 'Open', href: '/reports/ftabr26' },
};

/**
 * Pinned report cards for Home. They are not a section of their own any more
 * (fix list 17 Nov, 1.15): each Home renders these first inside "Latest from
 * Atlas", marked with a pin and an "Unpin", so a pinned report appears once.
 * Unpinning removes only the Home card; the toast points to Reports, which has
 * "Pin to home" to undo it.
 */
export function PinnedFeedCards() {
	const router = useRouter();
	const { visible, setPinned } = useHomePins();
	if (!FLAGS.benchmark || visible.length === 0) return null;

	const unpin = (p: HomePin) => {
		void setPinned(p.key, false);
		toast('Removed from Home. You can find it anytime in Reports.', {
			action: { label: 'Go to Reports', onClick: () => router.push(hrefOf('reports')) },
		});
	};

	return (
		<>
			{visible.map((p) => {
				const c = PIN_CARD[p.entry];
				return (
					<div key={p.key} className="bm-pin">
						<FeedCard tag={`Pinned · ${c.tag}`} icon={Pin} title={c.title} body={c.body} href={c.href} />
						<button type="button" className="bm-pin__remove" onClick={() => unpin(p)} aria-label={`Remove ${c.title} from Home`}>
							<X size={11} aria-hidden="true" /> Unpin
						</button>
					</div>
				);
			})}
		</>
	);
}

/** Titles of the reports pinned on Home, so the feed never shows one twice. */
export function usePinnedTitles(): Set<string> {
	const { visible } = useHomePins();
	return new Set(FLAGS.benchmark ? visible.map((p) => PIN_CARD[p.entry].title.toLowerCase()) : []);
}
