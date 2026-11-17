'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Files, UserRound } from 'lucide-react';
import { FeedCard } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import { ENTRY_PATH, ENTRY_TITLE, FLAGS } from './config';
import { useHomePins } from './use-benchmark';
import type { HomePin } from './types';

/** What each pin says, as a "Latest from Atlas" card (label, title, one line). */
const CARD: Record<HomePin['entry'], { tag: string; title: string; body: string; href: string; mine?: boolean }> = {
	r3: { tag: 'Your benchmark', title: ENTRY_TITLE.r3, body: 'Your fund’s deal sourcing against the 2026 benchmark, and the gaps worth closing.', href: ENTRY_PATH.r3, mine: true },
	r2: { tag: 'Report', title: ENTRY_TITLE.r2, body: 'How sports tech investors find, screen and close deals, and where the gaps are.', href: ENTRY_PATH.r2 },
	r1: { tag: 'Report', title: ENTRY_TITLE.r2, body: 'How sports tech investors find, screen and close deals, and where the gaps are.', href: ENTRY_PATH.r1 },
	ftr: { tag: 'Report', title: 'Football Tech & Business Report 2026', body: 'The companies, money and people shaping football’s business and technology.', href: '/reports/ftabr26' },
};

/** Whether Home has any pinned cards (Raise only draws its grid when there's something in it). */
export function useHasPins(): boolean {
	return useHomePins().visible.length > 0;
}

/**
 * Pinned research as the first cards of "Latest from Atlas" (every tier): at
 * most three, "Your benchmark" first, each until its `featured_until`. The pin
 * icon beside "Open" unpins it from Home only; the pop-up points to Reports,
 * which has "Pin to home" to undo it. Render inside `.atlas-feed-grid`.
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

	return visible.map((p) => {
		const c = CARD[p.entry];
		return (
			<FeedCard
				key={p.key}
				tag={c.tag}
				icon={c.mine ? UserRound : Files}
				title={c.title}
				body={c.body}
				href={c.href}
				pin={{ label: `Unpin ${c.title} from Home`, onUnpin: () => unpin(p) }}
			/>
		);
	});
}
