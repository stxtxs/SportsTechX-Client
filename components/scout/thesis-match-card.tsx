'use client';

import Link from 'next/link';
import { hrefOf } from '@/lib/routes';

/**
 * "Scout · Thesis match" card for the company profile rail.
 *
 * Handover v1 B4: the per-company match score is not built, so it reads
 * "Coming soon"; and the card does not list the thesis back to the user — that
 * lives in Account → Scouting thesis, which the link opens.
 */
export function ThesisMatchCard() {
	return (
		<section className="atlas-card atlas-co__side scout-match">
			<h2 className="atlas-co__h">Scout · Thesis match</h2>
			<p className="atlas-co__sub">Match score: <span className="atlas-soon">Coming soon</span></p>
			<Link href={hrefOf('thesis')} className="scout-link">Scouting thesis</Link>
		</section>
	);
}
