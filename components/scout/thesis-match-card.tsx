'use client';

import Link from 'next/link';
import { hrefOf } from '@/lib/routes';

/**
 * Scout match card for the company profile rail.
 *
 * Handover v1 B4: the per-company match score is not built, so it reads
 * "Coming soon"; the card does not list the Scout's preferences back to them —
 * those live in Account → Preferences, which the link opens (D1, 1.6).
 */
export function ThesisMatchCard() {
	return (
		<section className="atlas-card atlas-co__side scout-match">
			<h2 className="atlas-co__h">Scout · Match score</h2>
			<p className="atlas-co__sub">Match score: <span className="atlas-soon">Coming soon</span></p>
			<Link href={hrefOf('interests')} className="scout-link">Preferences</Link>
		</section>
	);
}
