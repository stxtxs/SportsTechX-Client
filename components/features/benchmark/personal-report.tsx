'use client';

import Link from 'next/link';
import { createContext, useContext, useState, type ReactNode } from 'react';
import useSWR from 'swr';
import { ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge, Button, Card, Eyebrow, Textarea } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { ROUTE_BY_ID, hrefOf } from '@/lib/routes';
import { EDITION, ENTRY_PATH, PEER_GROUP_MIN, SLUG, SOURCE } from './config';
import { GAP_FLAG, gapOf, peerOrSample } from './rules';
import { usePersonalBenchmark } from './use-benchmark';
import type { BenchmarkAccess, Compare, PersonalBenchmark } from './types';
import { fmtFullDate } from '@/lib/format';

/**
 * R3 — "Your benchmark": one fund's answers against the frozen 2026
 * baseline. Eight blocks in the spec's order, each with an empty state.
 * Never names another fund; deals are counts, never percentages.
 * The page's words (block titles, labels, empty states) are the Benchmark document's
 * `personal` entry (reports.content of the full report); the figures come from
 * /benchmark/:edition/mine. Only the correction form and load states are app UI.
 */
export interface PersonalCopy {
	/** {edition} */ eyebrow: string;
	/** {first} {fund} */ titleNamed: string;
	/** {fund} */ title: string;
	yourFund: string;
	/** {funds} */ intro: string;
	yours: string;
	/** {date} */ trial: string;
	priority: Record<string, string>;
	notEnough: string;
	legend: { you: string; average: string };
	/** {direction} {gap} */ flag: string;
	below: string; above: string;
	/** {yours} {avg} {n} */ compareVals: string;
	notUsed: string;
	headline: { title: string; satisfaction: string; /** {avg} */ satisfactionNote: string; topChannel: string; outbound: string };
	sources: { title: string; sub: string; none: string; deal: string; deals: string };
	ratings: { title: string; /** {gap} */ sub: string; none: string };
	outbound: { title: string; sub: string; none: string; noRating: string; yourPriority: string; /** {n} */ funds: string };
	tooling: { title: string; sub: string; none: string; platforms: string; noFit: string };
	challenges: { title: string; sub: string; none: string; challenges: string; reasons: string; noneSelected: string };
	peers: { title: string; /** {label} {funds} */ subPeer: string; /** {min} {funds} */ subAll: string; none: string };
	next: { title: string; sub: string; noGaps: string };
	/** {version} {date} */ footer: string;
	fullReport: string;
}

const SCALE = 5;
const fmt = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));
const fill = (tpl: string, vars: Record<string, string | number>) => tpl.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
const CopyContext = createContext<PersonalCopy | null>(null);
const useCopy = () => useContext(CopyContext)!;

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

function Legend() {
	const c = useCopy();
	return (
		<div className="bm-legend">
			<span><i style={{ background: 'var(--a-ink)' }} />{c.legend.you}</span>
			<span><i style={{ background: 'var(--a-navy)', opacity: 0.55 }} />{c.legend.average}</span>
		</div>
	);
}

function CompareRow({ c: row, flag }: { c: Compare; flag?: boolean }) {
	const c = useCopy();
	const gap = gapOf(row);
	const flagged = flag && gap !== null && Math.abs(gap) >= GAP_FLAG;
	return (
		<div>
			<div className="bm-row__top">
				<span>{row.label}{flagged && <span className="bm-flag"><Badge tone={gap! < 0 ? 'warn' : 'ok'}>{fill(c.flag, { direction: gap! < 0 ? c.below : c.above, gap: fmt(Math.abs(gap!)) })}</Badge></span>}</span>
				<span className="bm-row__vals">{fill(c.compareVals, { yours: row.yours === null ? c.notUsed : fmt(row.yours), avg: fmt(row.baseline), n: row.n })}</span>
			</div>
			<div className="bm-bar bm-bar--you"><span style={{ width: `${((row.yours ?? 0) / SCALE) * 100}%` }} /></div>
			<div className="bm-bar bm-bar--base"><span style={{ width: `${(row.baseline / SCALE) * 100}%` }} /></div>
		</div>
	);
}

function Rows({ items, flag }: { items: Compare[]; flag?: boolean }) {
	return <Card><Legend /><div className="bm-rows">{items.map((c) => <CompareRow key={c.label} c={c} flag={flag} />)}</div></Card>;
}

function Headline({ pb }: { pb: PersonalBenchmark }) {
	const c = useCopy();
	const h = pb.headline;
	return (
		<div className="bm-grid3">
			<Card>
				<div className={h.satisfaction?.yours != null ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'}>{h.satisfaction?.yours != null ? `${fmt(h.satisfaction.yours)}/5` : '—'}</div>
				<div className="bm-stat__label">{c.headline.satisfaction}</div>
				{h.satisfaction && <div className="bm-stat__note">{fill(c.headline.satisfactionNote, { avg: fmt(h.satisfaction.baseline) })}</div>}
			</Card>
			<Card>
				<div className={h.top_channel ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'} style={{ fontSize: h.top_channel ? 20 : undefined }}>{h.top_channel ?? '—'}</div>
				<div className="bm-stat__label">{c.headline.topChannel}</div>
			</Card>
			<Card>
				<div className={h.outbound_priority ? 'bm-stat__value' : 'bm-stat__value bm-stat__value--empty'} style={{ fontSize: h.outbound_priority ? 20 : undefined }}>{h.outbound_priority ? c.priority[h.outbound_priority] : '—'}</div>
				<div className="bm-stat__label">{c.headline.outbound}</div>
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
	// The page's words live in the full report's document (`personal`).
	const doc = useSWR<{ content?: { personal?: PersonalCopy } | null }>(SOURCE === 'api' ? qk.reports.detail(SLUG.r2) : null, { shouldRetryOnError: false });
	const c = doc.data?.content?.personal;
	if (isLoading || doc.isLoading) return null;
	if (!pb || !c) {
		return (
			<Empty>
				{!pb && error?.status === 404
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
		<CopyContext.Provider value={c}>
			<header className="bm-cover">
				<Eyebrow>{fill(c.eyebrow, { edition: pb.edition })}</Eyebrow>
				<h1>{first ? fill(c.titleNamed, { first, fund: fund ?? c.yourFund }) : fill(c.title, { fund: fund ?? c.yourFund })}</h1>
				<p>{fill(c.intro, { funds: pb.full_sample.funds })}</p>
				<div className="bm-cover__meta">
					<Badge tone="navy">{c.yours}</Badge>
					{trialEnds && <Badge tone="neutral">{fill(c.trial, { date: trialEnds })}</Badge>}
				</div>
			</header>

			<Block n={1} title={c.headline.title}><Headline pb={pb} /></Block>

			<Block n={2} title={c.sources.title} sub={c.sources.sub}>
				{!pb.enough_deal_data ? <Empty>{c.notEnough}</Empty>
					: pb.deal_sources.length === 0 ? <Empty>{c.sources.none}</Empty>
						: <ul className="bm-list">{pb.deal_sources.map((d) => <li key={d.channel}><span>{d.channel}</span><b>{d.deals} {d.deals === 1 ? c.sources.deal : c.sources.deals}</b></li>)}</ul>}
			</Block>

			<Block n={3} title={c.ratings.title} sub={fill(c.ratings.sub, { gap: GAP_FLAG })}>
				{pb.channel_ratings.length === 0 ? <Empty>{c.ratings.none}</Empty> : <Rows items={pb.channel_ratings} flag />}
			</Block>

			<Block n={4} title={c.outbound.title} sub={c.outbound.sub}>
				{!pb.outbound ? <Empty>{c.outbound.none}</Empty> : (
					<div className="bm-grid2">
						{pb.outbound.rating ? <Rows items={[pb.outbound.rating]} flag /> : <Empty>{c.outbound.noRating}</Empty>}
						<Card>
							<div className="bm-stat__label" style={{ marginTop: 0 }}>{c.outbound.yourPriority}</div>
							<div className="bm-stat__value" style={{ fontSize: 20, marginTop: 4 }}>{pb.headline.outbound_priority ? c.priority[pb.headline.outbound_priority] : '—'}</div>
							<ul className="bm-list" style={{ marginTop: 14 }}>
								{(['high', 'moderate', 'not_a_priority'] as const).map((k) => (
									<li key={k}><span>{c.priority[k]}</span><b>{fill(c.outbound.funds, { n: pb.outbound!.baseline_priority[k] })}</b></li>
								))}
							</ul>
						</Card>
					</div>
				)}
			</Block>

			<Block n={5} title={c.tooling.title} sub={c.tooling.sub}>
				{!pb.tooling ? <Empty>{c.tooling.none}</Empty> : (
					<div className="bm-grid2">
						<Card><div className="bm-stat__label" style={{ marginTop: 0, marginBottom: 10 }}>{c.tooling.platforms}</div><div className="bm-chips">{pb.tooling.platforms.map((p) => <span key={p} className="bm-chip">{p}</span>)}</div></Card>
						{pb.tooling.fit ? <Rows items={[pb.tooling.fit]} flag /> : <Empty>{c.tooling.noFit}</Empty>}
					</div>
				)}
			</Block>

			<Block n={6} title={c.challenges.title} sub={c.challenges.sub}>
				{pb.challenges.length === 0 && pb.dissatisfaction_reasons.length === 0 ? <Empty>{c.challenges.none}</Empty> : (
					<div className="bm-grid2">
						<Card><div className="bm-stat__label" style={{ marginTop: 0, marginBottom: 10 }}>{c.challenges.challenges}</div>{pb.challenges.length ? <div className="bm-chips">{pb.challenges.map((x) => <span key={x} className="bm-chip">{x}</span>)}</div> : <span className="bm-stat__label">{c.challenges.noneSelected}</span>}</Card>
						<Card><div className="bm-stat__label" style={{ marginTop: 0, marginBottom: 10 }}>{c.challenges.reasons}</div>{pb.dissatisfaction_reasons.length ? <div className="bm-chips">{pb.dissatisfaction_reasons.map((x) => <span key={x} className="bm-chip">{x}</span>)}</div> : <span className="bm-stat__label">{c.challenges.noneSelected}</span>}</Card>
					</div>
				)}
			</Block>

			<Block
				n={7}
				title={c.peers.title}
				sub={peers.isPeer
					? fill(c.peers.subPeer, { label: peers.label, funds: peers.funds })
					: fill(c.peers.subAll, { min: PEER_GROUP_MIN, funds: peers.funds })}
			>
				{!pb.enough_deal_data && peers.comparisons.length === 0 ? <Empty>{c.notEnough}</Empty>
					: peers.comparisons.length === 0 ? <Empty>{c.peers.none}</Empty>
						: <Rows items={peers.comparisons} />}
			</Block>

			<Block n={8} title={c.next.title} sub={c.next.sub}>
				{steps.length === 0 ? <Empty>{pb.enough_deal_data ? c.next.noGaps : c.notEnough}</Empty> : (
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
				<span>{fill(c.footer, { version: pb.baseline_version, date: fmtFullDate(new Date(pb.generated_at)) })} · <Link href={ENTRY_PATH.r2}>{c.fullReport}</Link></span>
				<CorrectionLink />
			</footer>
		</CopyContext.Provider>
	);
}
