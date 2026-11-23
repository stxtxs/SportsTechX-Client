'use client';

import { Badge, Card, Eyebrow, PlaceholderTag } from '@/components/atlas';
import { ENTRY_PATH, ENTRY_TITLE } from './config';
import { PersonaCta } from './persona-cta';
import { useBenchmarkSummary } from './use-benchmark';
import type { BenchmarkAccess, SummaryContent } from './types';

/**
 * R1 — the 2-page summary, free to every signed-in user: cover, three
 * headline numbers, one chart, and the call to action by persona.
 *
 * The summary copy does not exist yet (a separate writing task). Until its
 * `content` is published on the `investors-survey26-summary` record, this
 * renders the layout with placeholders — no figures are bundled here.
 */
const PLACEHOLDER: SummaryContent = {
	eyebrow: 'VC Deal Sourcing Benchmark 2026 · Summary',
	title: ENTRY_TITLE.r1,
	subtitle: 'How sports tech investors find, screen and close deals, and where the gaps are.',
	headlines: [
		{ label: 'Headline finding one', value: null },
		{ label: 'Headline finding two', value: null },
		{ label: 'Headline finding three', value: null },
	],
	chart: null,
	published: null,
};

export function SummaryReport({ access, embedded }: { access: BenchmarkAccess; embedded?: boolean }) {
	const { summary } = useBenchmarkSummary();
	const s = summary ?? PLACEHOLDER;
	const max = Math.max(1, ...(s.chart?.rows.map((r) => r.value) ?? [1]));

	return (
		<>
			<header className="bm-cover">
				{s.eyebrow && <Eyebrow>{s.eyebrow}</Eyebrow>}
				{embedded ? <h2 className="atlas-h1" style={{ margin: '10px 0 0' }}>{s.title}</h2> : <h1>{s.title}</h1>}
				<p>{s.subtitle}</p>
				<div className="bm-cover__meta">
					<Badge tone="ok">Free</Badge>
					{!summary && <PlaceholderTag />}
				</div>
			</header>

			<div className="bm-grid3">
				{s.headlines.slice(0, 3).map((h) => (
					<Card key={h.label}>
						<div className={h.value ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'}>{h.value ?? '—'}</div>
						<div className="bm-stat__label">{h.label}</div>
						{h.note && <div className="bm-stat__note">{h.note}</div>}
					</Card>
				))}
			</div>

			<section className="bm-block">
				<div className="bm-block__head"><h2 className="bm-block__title">{s.chart?.title ?? 'Headline chart'}</h2></div>
				{s.chart ? (
					<Card>
						<div className="bm-rows">
							{s.chart.rows.map((r) => (
								<div key={r.label}>
									<div className="bm-row__top"><span>{r.label}</span><span className="bm-row__vals">{r.value}</span></div>
									<div className="bm-bar bm-bar--you"><span style={{ width: `${(r.value / max) * 100}%` }} /></div>
								</div>
							))}
						</div>
						<p className="bm-block__sub" style={{ margin: '14px 0 0' }}>{s.chart.basis}</p>
					</Card>
				) : (
					<div className="bm-empty">The summary chart will appear here once the two-page summary is published.</div>
				)}
			</section>

			{access.entries.r2 === 'open' && !embedded && (
				<p style={{ marginTop: 28, fontSize: 14 }}>
					Want the detail? <a href={ENTRY_PATH.r2}>Read the full report</a>.
				</p>
			)}

			<PersonaCta access={access} source={embedded ? 'r2_upgrade_screen' : 'r1'} />
		</>
	);
}
