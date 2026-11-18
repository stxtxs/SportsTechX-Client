'use client';

import Link from 'next/link';
import { PLANS_PATH } from '@/lib/routes';

/**
 * "You are seeing the first N of M." Shown when the server capped the result
 * window for a free or anonymous caller.
 *
 * The copy is the Explore mockup's, verbatim: "Showing the first 100 matching
 * companies" / "Refine your search or filters to narrow the results." The real
 * total stays on screen on purpose — a free user is told how much is there,
 * which is the whole upgrade argument.
 *
 * The cap is enforced in the API (`common/pagination/free-tier-cap.ts`), not
 * here. This only explains it.
 */
export function ResultCapNote({ cap, total, noun }: {
	/** `cap` from the list response — absent for paid tiers, so nothing renders. */
	cap: number | undefined;
	total: number;
	/** Plural noun for the copy, e.g. "companies". */
	noun: string;
}) {
	if (!cap || total <= cap) return null;
	return (
		<div className="atlas-card" style={{ padding: '14px 18px', marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'baseline' }}>
			<span style={{ fontFamily: 'var(--a-font)', fontWeight: 600, color: 'var(--a-ink)' }}>
				Showing the first {cap.toLocaleString()} matching {noun}
			</span>
			<span style={{ fontSize: 13, color: 'var(--a-muted)' }}>
				{/* Handover v1 §5, Companies limit line (Explore). */}
				Refine your search or filters to narrow the results, or{' '}
				<Link href={PLANS_PATH} style={{ color: 'var(--atlas-product, var(--a-ink))' }}>switch to Raise or Scout</Link> to see all {total.toLocaleString()}.
			</span>
		</div>
	);
}
