'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Eyebrow, Textarea } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { ROUTE_BY_ID, hrefOf } from '@/lib/routes';
import { EDITION, ENTRY_PATH, PEER_GROUP_MIN, SOURCE } from './config';
import { GAP_FLAG, gapOf, peerOrSample } from './rules';
import { usePersonalBenchmark } from './use-benchmark';
import type { BenchmarkAccess, Compare, PersonalBenchmark } from './types';
import { fmtFullDate } from '@/lib/format';

/**
 * R3 — "Your benchmark": one fund's answers against the frozen 2026
 * baseline. Eight blocks in the spec's order, each with an empty state.
 * Never names another fund; deals are counts, never percentages.
 */
const SCALE = 5;
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const PRIORITY: Record<string, string> = { high: 'High priority', moderate: 'Moderate priority', not_a_priority: 'Not a priority' };

function Block({ n, title, sub, children }: { n: number; title: string; sub?: string; children: ReactNode }) {
	return (
		<section className="bm-block" aria-labelledby={`bm-b${n}`}>
			<div className="bm-block__head"><span className="bm-block__n">{String(n).padStart(2, '0')}</span><h2 id={`bm-b${n}`} className="bm-block__title">{title}</h2></div>
			{sub && <p className="bm-block__sub">{sub}</p>}
			{children}
		</section>
	);
}

const Empty = ({ children }: { children: ReactNode }) => <div className="bm-empty">{children}</div>;
const NOT_ENOUGH = 'Not enough data: this needs at least two investments from your survey answers.';

function Legend() {
	return (
		<div className="bm-legend">
			<span><i style={{ background: 'var(--a-ink)' }} />Your fund</span>
			<span><i style={{ background: 'var(--a-navy)', opacity: 0.55 }} />Benchmark average</span>
		</div>
	);
}

function CompareRow({ c, flag }: { c: Compare; flag?: boolean }) {
	const gap = gapOf(c);
	const flagged = flag && gap !== null && Math.abs(gap) >= GAP_FLAG;
	return (
		<div>
			<div className="bm-row__top">
				<span>{c.label}{flagged && <span className="bm-flag"><Badge tone={gap! < 0 ? 'warn' : 'ok'}>{gap! < 0 ? 'Below' : 'Above'} by {fmt(Math.abs(gap!))}</Badge></span>}</span>
				<span className="bm-row__vals">{c.yours === null ? 'not used' : fmt(c.yours)} · avg {fmt(c.baseline)} ({c.n} funds)</span>
			</div>
			<div className="bm-bar bm-bar--you"><span style={{ width: `${((c.yours ?? 0) / SCALE) * 100}%` }} /></div>
			<div className="bm-bar bm-bar--base"><span style={{ width: `${(c.baseline / SCALE) * 100}%` }} /></div>
		</div>
	);
}

function Rows({ items, flag }: { items: Compare[]; flag?: boolean }) {
	return <Card><Legend /><div className="bm-rows">{items.map((c) => <CompareRow key={c.label} c={c} flag={flag} />)}</div></Card>;
}

function Headline({ pb }: { pb: PersonalBenchmark }) {
	const h = pb.headline;
	return (
		<div className="bm-grid3">
			<Card>
				<div className={h.satisfaction?.yours != null ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'}>{h.satisfaction?.yours != null ? `${fmt(h.satisfaction.yours)}/5` : '—'}</div>
				<div className="bm-stat__label">Satisfaction with your deal flow</div>
				{h.satisfaction && <div className="bm-stat__note">Benchmark average {fmt(h.satisfaction.baseline)}/5</div>}
			</Card>
			<Card>
				<div className={h.top_channel ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'} style={{ fontSize: h.top_channel ? 20 : undefined }}>{h.top_channel ?? '—'}</div>
				<div className="bm-stat__label">Your top-ranked sourcing channel</div>
			</Card>
			<Card>
				<div className={h.outbound_priority ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'} style={{ fontSize: h.outbound_priority ? 20 : undefined }}>{h.outbound_priority ? PRIORITY[h.outbound_priority] : '—'}</div>
				<div className="bm-stat__label">Outbound for your fund</div>
			</Card>
		</div>
	);
}

/** "Something looks wrong" → a correction request the team handles in admin. */
function CorrectionLink() {
	const [open, setOpen] = useState(false);
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const send = async () => {
		if (!text.trim()) return;
		setBusy(true);
		try {
			if (SOURCE === 'api') {
				const r = await apiRequest('POST', `/api/benchmark/${EDITION}/corrections`, { message: text.trim() });
				if (!r.ok) throw new Error(String(r.status));
			}
			toast.success('Thanks. We’ll check it and update your benchmark.');
			setOpen(false); setText('');
		} catch {
			toast.error('Could not send that. Try again, or email us.');
		} finally { setBusy(false); }
	};
	if (!open) return <button type="button" className="bm-linkbtn" onClick={() => setOpen(true)}>Something looks wrong?</button>;
	return (
		<Card style={{ width: '100%' }}>
			<strong style={{ fontSize: 14 }}>What looks wrong?</strong>
			<Textarea className="bm-textarea" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tell us which number and what you expected." />
			<div className="bm-actions">
				<Button size="sm" disabled={busy || !text.trim()} onClick={() => void send()}>Send</Button>
				<Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
			</div>
		</Card>
	);
}

export function PersonalReport({ access }: { access: BenchmarkAccess }) {
	const { data: pb, isLoading, error } = usePersonalBenchmark(true);
	if (isLoading) return null;
	if (!pb) {
		return (
			<Empty>
				{error?.status === 404
					? 'Your benchmark is still being prepared. We’ll email you when it’s ready.'
					: 'Your benchmark could not be loaded. Refresh the page to try again.'}
			</Empty>
		);
	}

	// Greeting fallback: no fund name (or "Anonymous") → the respondent and "your fund".
	const fund = pb.fund_name && pb.fund_name.toLowerCase() !== 'anonymous' ? pb.fund_name : null;
	const first = pb.respondent_name?.trim().split(/\s+/)[0];
	const peers = peerOrSample(pb);
	const trialEnds = access.trial?.status === 'active' ? new Date(access.trial.ends_at).toLocaleDateString(undefined, { day: 'numeric', month: 'long' }) : null;
	const steps = pb.next_steps.filter((s) => ROUTE_BY_ID.has(s.route)).slice(0, 3);

	return (
		<>
			<header className="bm-cover">
				<Eyebrow>VC Deal Sourcing Benchmark {pb.edition} · Your benchmark</Eyebrow>
				<h1>{first ? `${first}, here is how ${fund ?? 'your fund'} compares` : `How ${fund ?? 'your fund'} compares`}</h1>
				<p>Your survey answers against the {pb.full_sample.funds} funds in the 2026 benchmark. Only you can see this page.</p>
				<div className="bm-cover__meta">
					<Badge tone="navy">Yours</Badge>
					{trialEnds && <Badge tone="neutral">Scout trial until {trialEnds}</Badge>}
				</div>
			</header>

			<Block n={1} title="Headline"><Headline pb={pb} /></Block>

			<Block n={2} title="Where your deals came from" sub="Deals you traced, by the channel that brought them. Counts, up to three per fund.">
				{!pb.enough_deal_data ? <Empty>{NOT_ENOUGH}</Empty>
					: pb.deal_sources.length === 0 ? <Empty>You didn’t trace any deals to a channel in the survey.</Empty>
						: <ul className="bm-list">{pb.deal_sources.map((d) => <li key={d.channel}><span>{d.channel}</span><b>{d.deals} {d.deals === 1 ? 'deal' : 'deals'}</b></li>)}</ul>}
			</Block>

			<Block n={3} title="How you rate each channel" sub={`Your rating out of 5 against the benchmark average. Gaps of ${GAP_FLAG} point or more are flagged.`}>
				{pb.channel_ratings.length === 0 ? <Empty>You didn’t rate any channels in the survey.</Empty> : <Rows items={pb.channel_ratings} flag />}
			</Block>

			<Block n={4} title="Outbound" sub="How you rate outbound and how much priority you give it, against the benchmark.">
				{!pb.outbound ? <Empty>You didn’t answer the outbound questions.</Empty> : (
					<div className="bm-grid2">
						{pb.outbound.rating ? <Rows items={[pb.outbound.rating]} flag /> : <Empty>No outbound rating.</Empty>}
						<Card>
							<div className="bm-stat__label" style={{ marginTop: 0 }}>Your priority</div>
							<div className="bm-stat__value" style={{ fontSize: 20, marginTop: 4 }}>{pb.headline.outbound_priority ? PRIORITY[pb.headline.outbound_priority] : '—'}</div>
							<ul className="bm-list" style={{ marginTop: 14 }}>
								<li><span>High priority</span><b>{pb.outbound.baseline_priority.high} funds</b></li>
								<li><span>Moderate priority</span><b>{pb.outbound.baseline_priority.moderate} funds</b></li>
								<li><span>Not a priority</span><b>{pb.outbound.baseline_priority.not_a_priority} funds</b></li>
							</ul>
						</Card>
					</div>
				)}
			</Block>

			<Block n={5} title="Tooling" sub="For funds that use a data platform: which ones, and how well they fit your sourcing.">
				{!pb.tooling ? <Empty>You told us you don’t use a data platform, so there is nothing to compare here.</Empty> : (
					<div className="bm-grid2">
						<Card><div className="bm-stat__label" style={{ marginTop: 0, marginBottom: 10 }}>Platforms you use</div><div className="bm-chips">{pb.tooling.platforms.map((p) => <span key={p} className="bm-chip">{p}</span>)}</div></Card>
						{pb.tooling.fit ? <Rows items={[pb.tooling.fit]} flag /> : <Empty>No fit rating.</Empty>}
					</div>
				)}
			</Block>

			<Block n={6} title="Challenges" sub="What you said makes sourcing hard, and why you’re not fully satisfied.">
				{pb.challenges.length === 0 && pb.dissatisfaction_reasons.length === 0 ? <Empty>You didn’t select any challenges.</Empty> : (
					<div className="bm-grid2">
						<Card><div className="bm-stat__label" style={{ marginTop: 0, marginBottom: 10 }}>Challenges</div>{pb.challenges.length ? <div className="bm-chips">{pb.challenges.map((c) => <span key={c} className="bm-chip">{c}</span>)}</div> : <span className="bm-stat__label">None selected</span>}</Card>
						<Card><div className="bm-stat__label" style={{ marginTop: 0, marginBottom: 10 }}>Reasons for dissatisfaction</div>{pb.dissatisfaction_reasons.length ? <div className="bm-chips">{pb.dissatisfaction_reasons.map((c) => <span key={c} className="bm-chip">{c}</span>)}</div> : <span className="bm-stat__label">None selected</span>}</Card>
					</div>
				)}
			</Block>

			<Block
				n={7}
				title="Where you sit"
				sub={peers.isPeer
					? `Against funds of your size: ${peers.label} (${peers.funds} funds).`
					: `Your size group has fewer than ${PEER_GROUP_MIN} funds, so this compares you with all ${peers.funds} funds.`}
			>
				{!pb.enough_deal_data && peers.comparisons.length === 0 ? <Empty>{NOT_ENOUGH}</Empty>
					: peers.comparisons.length === 0 ? <Empty>No comparison available yet.</Empty>
						: <Rows items={peers.comparisons} />}
			</Block>

			<Block n={8} title="Next steps" sub="Your three biggest gaps, and where in Atlas to work on each.">
				{steps.length === 0 ? <Empty>{pb.enough_deal_data ? 'No clear gaps against the benchmark.' : NOT_ENOUGH}</Empty> : (
					<div className="bm-next">
						{steps.map((s) => (
							<Link key={s.gap} href={hrefOf(s.route)}>
								<span>{s.gap}</span>
								<strong style={{ display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>{s.label} <ArrowRight size={13} /></strong>
							</Link>
						))}
					</div>
				)}
			</Block>

			<footer className="bm-footer">
				<span>Benchmark baseline v{pb.baseline_version} · generated {fmtFullDate(new Date(pb.generated_at))} · <Link href={ENTRY_PATH.r2}>Full report</Link></span>
				<CorrectionLink />
			</footer>
		</>
	);
}
