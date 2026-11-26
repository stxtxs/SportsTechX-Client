'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { hrefOf } from '@/lib/routes';
import { qk } from '@/lib/query-keys';

/**
 * Scout match card for the company profile rail (Deal Flow 6.3): how this company meets the
 * Scout's Preferences, as on Recommended: the share of filled-in preferences met and up to three
 * reasons. The card doesn't list the preferences themselves; they live in Preferences (D1, 1.6).
 */
interface Match { score: number | null; why: string[]; hidden: boolean; filled: number }

export function ThesisMatchCard({ idOrSlug }: { idOrSlug: string }) {
	// Same request as the profile itself, so this costs nothing extra.
	const { data: company } = useSWR<{ id: string }>(qk.companies.detail(idOrSlug));
	const { data: m } = useSWR<Match>(company?.id ? qk.scout.companyMatch(company.id) : null);
	return (
		<section className="atlas-card atlas-co__side scout-match">
			<h2 className="atlas-co__h">Scout · Match score</h2>
			{!m ? <p className="atlas-co__sub">Match score: …</p>
				: m.filled === 0 ? <p className="atlas-co__sub">Add your preferences to see how companies match them.</p>
				: m.hidden ? <p className="atlas-co__sub">In your Avoid list.</p>
				: (
					<>
						<p className="atlas-co__sub">Match score: <strong style={{ color: 'var(--a-ink)' }}>{m.score ?? 0}%</strong> of your preferences</p>
						{m.why.length > 0 && <div className="scout-tags" style={{ marginTop: 8 }}>{m.why.map((w) => <span key={w} className="scout-tag">{w}</span>)}</div>}
					</>
				)}
			<Link href={hrefOf('interests')} className="scout-link">Preferences</Link>
		</section>
	);
}
