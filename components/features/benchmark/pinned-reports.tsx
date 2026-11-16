'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Files, UserRound, X } from 'lucide-react';
import { FeedCard, SectionHead } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import { ENTRY_PATH, ENTRY_TITLE, FLAGS } from './config';
import { useHomePins } from './use-benchmark';
import type { HomePin } from './types';
import './benchmark.css';

/** What each pin says. Reuses the "Latest from Atlas" card (label, title, one line, action). */
const CARD: Record<HomePin['entry'], { tag: string; title: string; body: string; action: string; href: string; mine?: boolean }> = {
	r3: { tag: 'Your benchmark', title: ENTRY_TITLE.r3, body: 'Your fund’s deal sourcing against the 2026 benchmark, and the gaps worth closing.', action: 'Open', href: ENTRY_PATH.r3, mine: true },
	r2: { tag: 'Report', title: ENTRY_TITLE.r2, body: 'How sports tech investors find, screen and close deals, and where the gaps are.', action: 'Read the full report', href: ENTRY_PATH.r2 },
	r1: { tag: 'Report', title: ENTRY_TITLE.r2, body: 'How sports tech investors find, screen and close deals, and where the gaps are.', action: 'Read the summary', href: ENTRY_PATH.r1 },
	ftr: { tag: 'Report', title: 'Football Tech & Business Report 2026', body: 'The companies, money and people shaping football’s business and technology.', action: 'Read the report', href: '/reports/ftabr26' },
};

/**
 * Pinned report cards on Home (every tier): at most three, "Your benchmark"
 * first, each until its `featured_until`. Unpinning removes only the Home
 * card; the pop-up points to Reports, which has "Pin to home" to undo it.
 */
export function PinnedReports() {
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
		<section className="bm-pins" aria-label="Pinned reports">
			<SectionHead title="Pinned for you" meta="New research on Atlas" />
			<div className="atlas-feed-grid">
				{visible.map((p) => {
					const c = CARD[p.entry];
					return (
						<div key={p.key} className="bm-pin">
							<FeedCard tag={c.tag} icon={c.mine ? UserRound : Files} title={c.title} body={c.body} href={c.href} actionLabel={c.action} />
							<button type="button" className="bm-pin__remove" onClick={() => unpin(p)} aria-label={`Remove ${c.title} from Home`}>
								<X size={11} aria-hidden="true" /> Unpin
							</button>
						</div>
					);
				})}
			</div>
		</section>
	);
}
