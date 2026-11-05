'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { Deal } from '@/types/api';
import Link from 'next/link';
import { Card, Loading, Badge, PieDonut, PieLegend, Seg, type PieSegment, paletteAt } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { Combobox } from '@/components/atlas/ui/combobox';
import { MONTHS } from '@/lib/catalog-options';
import { companyHref } from '@/lib/routes';
import { fmtUsd, fmtCount } from './format';
import './market.css';

type Mode = 'funding' | 'ma';
type Metric = 'amount' | 'count';
type Perspective = 'acquiree' | 'acquirer';
type SectorView = 'sector' | 'sub';

interface Grouping { label: string; deal_count: number; total_amount: number }
interface RoundupStats {
	total_amount: number; count: number; largest_amount: number; largest_company: string | null;
	prev_total_amount: number; prev_count: number;
	disclosed_count: number; avg_amount: number;
	/** Month-over-month % (server applies the IH rule for an empty previous month). */
	change: { total_amount: number; avg_amount: number; count: number };
}
/** Rows with no sector / business model / country — drawn in neutral grey. */
const UNCLASSIFIED = 'Unclassified';
const UNCLASSIFIED_COLOR = '#C9CDD5';
const TABLE_LIMIT = 200;
interface NewsItem {
	id: string; section: string; category: string | null; headline: string;
	body: string | null; org: string | null; geo: string | null; source_url: string | null;
}
interface Roundup {
	year: number; month: number; mode: Mode; perspective?: Perspective;
	edition: { title: string | null; summary: string | null } | null;
	news: NewsItem[]; stats: RoundupStats;
	by_sector: Grouping[]; by_sub_sector?: Grouping[]; by_business_model: Grouping[]; by_geo: Grouping[];
}
/** Largest-deal row for the M&A table (subset of /api/acquisitions). */
interface AcqRow {
	id: string; acquiree_name: string | null; acquiree_slug: string | null;
	acquirer_name: string | null; hq_city: string | null; hq_country: string | null;
	amount_usd: number | string | null;
}

const pad = (n: number) => String(n).padStart(2, '0');
const YEARS: [string, string][] = (() => {
	const now = new Date().getUTCFullYear();
	const out: [string, string][] = [];
	for (let y = now; y >= now - 6; y--) out.push([String(y), String(y)]);
	return out;
})();

/**
 * Market → Monthly Roundup. Editorial header + curated news (from
 * /api/market/roundup) plus live-aggregated KPIs, donuts and the top-deals table
 * for the selected month. A Funding/M&A toggle swaps the whole numeric side
 * between the deals and acquisitions markets (mirrors the hub); an Amount/Count
 * toggle flips every breakdown donut between capital and deal volume.
 */
export function MarketRoundup() {
	const [mode, setMode] = useState<Mode>('funding');
	// `null` = auto: Amount, unless the month has no disclosed value at all.
	const [metricPick, setMetric] = useState<Metric | null>(null);
	const [perspective, setPerspective] = useState<Perspective>('acquiree');
	const [sectorView, setSectorView] = useState<SectorView>('sector');
	const [breakdown, setBreakdown] = useState<{ title: string; rows: Grouping[] } | null>(null);
	// `null` = "whatever the server says is the latest month with data".
	// Seeding this to the previous calendar month is what made the page look
	// broken: ingest is behind, so it opened on a month of zeros. The server
	// resolves the default per mode and echoes the month it chose.
	const [sel, setSel] = useState<{ year: number; month: number } | null>(null);

	const roundup = useSWR<Roundup>(qk.market.roundup({ ...(sel ?? {}), mode, ...(mode === 'ma' ? { perspective } : {}) }));
	const shown = sel ?? (roundup.data ? { year: roundup.data.year, month: roundup.data.month } : null);
	const year = shown?.year ?? new Date().getUTCFullYear();
	const month = shown?.month ?? 1;
	const setYear = (y: number) => setSel({ year: y, month });
	const setMonth = (m: number) => setSel({ year, month: m });

	const start = `${year}-${pad(month)}-01`;
	// The deals/acquisitions `to` bound is INCLUSIVE server-side, so use the last
	// day of the month — passing the 1st of the next month would leak that day's
	// rows into this month's list (and double-count them next month).
	const end = `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}`;
	// Largest deals this month — deals for funding, acquisitions for M&A. Held
	// until the month is known, and only the active market's list is fetched.
	const deals = useSWR<{ data: Deal[]; total?: number }>(shown && mode === 'funding' ? qk.deals.list({ from: start, to: end, sort: '-amount_usd', limit: TABLE_LIMIT }) : null);
	const acqs = useSWR<{ data: AcqRow[]; total?: number }>(shown && mode === 'ma' ? qk.acquisitions.list({ from: start, to: end, sort: '-amount_usd', limit: TABLE_LIMIT }) : null);
	const list = mode === 'funding' ? deals.data : acqs.data;

	const monthName = MONTHS.find(([v]) => v === String(month))?.[1] ?? '';
	const s = roundup.data?.stats;
	const total = s?.total_amount ?? 0;
	const count = s?.count ?? 0;
	const avg = s?.avg_amount ?? 0; // disclosed rounds only (IH semantics)
	const metric: Metric = metricPick ?? (s && s.total_amount === 0 ? 'count' : 'amount');

	const summary = useMemo(() => {
		if (roundup.data?.edition?.summary) return roundup.data.edition.summary;
		if (!s) return '';
		const noun = mode === 'ma' ? 'acquisition' : 'funding round';
		const lead = s.largest_company && s.largest_amount > 0
			? `, led by ${s.largest_company}'s ${fmtUsd(s.largest_amount)} ${mode === 'ma' ? 'deal' : 'round'}`
			: '';
		return `In ${monthName} ${year}, ${fmtCount(s.count)} ${noun}${s.count === 1 ? '' : 's'} totalling ${fmtUsd(s.total_amount)} were recorded across the sports-tech market${lead}.`;
	}, [roundup.data, s, monthName, year, mode]);

	const donuts = useMemo(() => {
		const d = roundup.data;
		if (!d) return [] as { title: string; total: string; unit: string; segments: PieSegment[]; rows: Grouping[]; zero: boolean }[];
		const val = (x: Grouping) => (metric === 'amount' ? x.total_amount : x.deal_count);
		const fmtV = (n: number) => (metric === 'amount' ? fmtUsd(n) : fmtCount(n));
		// The server never drops rows (missing values → 'Unclassified'), so the
		// centre is the stat tile itself and the slices add up to it.
		const centre = metric === 'amount' ? d.stats.total_amount : d.stats.count;
		const mk = (title: string, g: Grouping[]) => {
			// Top 7 slices + everything else folded into "Others", so the ring is the
			// whole month; the breakdown dialog lists every group.
			const sorted = [...g].sort((a, b) => val(b) - val(a));
			const top = sorted.length > 8 ? sorted.slice(0, 7) : sorted;
			const rest = sorted.slice(top.length).reduce((a, x) => a + val(x), 0);
			let ci = 0;
			const segments: PieSegment[] = top.map((x) => ({
				name: x.label, v: val(x), label: fmtV(val(x)),
				color: x.label === UNCLASSIFIED ? UNCLASSIFIED_COLOR : paletteAt(ci++),
			}));
			if (rest > 0) segments.push({ name: 'Others', v: rest, label: fmtV(rest), color: paletteAt(ci) });
			// Deals exist but none disclosed a value (common for M&A): every slice is
			// $0, which PieDonut draws as an empty ring — flag it for an empty state.
			return { title, total: fmtV(centre), unit: metric === 'amount' ? 'total' : 'deals', segments, rows: sorted, zero: g.length > 0 && centre === 0 };
		};
		const sectorG = sectorView === 'sector' ? d.by_sector : (d.by_sub_sector ?? d.by_sector);
		return [
			mk(sectorView === 'sector' ? 'By sector' : 'By sub-sector', sectorG),
			mk('By business model', d.by_business_model),
			mk('By country', d.by_geo),
		];
	}, [roundup.data, metric, sectorView]);

	const sections = useMemo(() => {
		const news = roundup.data?.news ?? [];
		const map = new Map<string, NewsItem[]>();
		for (const n of news) { const arr = map.get(n.section) ?? []; arr.push(n); map.set(n.section, arr); }
		return [...map.entries()];
	}, [roundup.data]);

	// Counts back from the month on screen, which starts at the latest month
	// that has data — not from today. An archive of empty months is worse than
	// no archive.
	const archive = useMemo(() => {
		if (!shown) return [] as { year: number; month: number; label: string }[];
		const out: { year: number; month: number; label: string }[] = [];
		let y = shown.year, m = shown.month;
		for (let i = 0; i < 12; i++) {
			out.push({ year: y, month: m, label: `${MONTHS.find(([v]) => v === String(m))?.[1]} ${y}` });
			m -= 1; if (m < 1) { m = 12; y -= 1; }
		}
		return out;
	}, [shown?.year, shown?.month]);

	return (
		<div style={{ display: 'grid', gap: 24 }}>
			{/* Header + month/year */}
			<div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
				<div>
					<div style={{ fontFamily: 'var(--a-font)', fontSize: 21, fontWeight: 700, color: 'var(--a-ink)', marginBottom: 12 }}>{roundup.data?.edition?.title || `${monthName} ${year} Sports-Tech Roundup`}</div>
					<div style={{ fontSize: 13, color: 'var(--a-muted)' }}>The most relevant developments from across the global sports-tech market.</div>
				</div>
				<div style={{ display: 'flex', gap: 10 }}>
					<Combobox className="atlas-select atlas-select--pill" ariaLabel="Month" value={String(month)} onChange={(v) => setMonth(Number(v))} style={{ width: 132 }} options={MONTHS.map(([v, l]) => [String(v), l] as [string, string])} />
					<Combobox className="atlas-select atlas-select--pill" ariaLabel="Year" value={String(year)} onChange={(v) => setYear(Number(v))} style={{ width: 92 }} options={YEARS.map(([v, l]) => [String(v), l] as [string, string])} />
				</div>
			</div>

			{/* Funding / M&A + Amount / Count */}
			<div className="atlas-controls">
				<Seg<Mode> ariaLabel="Market" value={mode} onChange={setMode} options={[{ key: 'funding', label: 'Funding' }, { key: 'ma', label: 'M&A' }]} />
				<Seg<Metric> ariaLabel="Metric" value={metric} onChange={setMetric} options={[{ key: 'amount', label: 'Amount' }, { key: 'count', label: 'Count' }]} />
				{mode === 'ma' && <Seg<Perspective> ariaLabel="Perspective" value={perspective} onChange={setPerspective} options={[{ key: 'acquiree', label: 'Acquiree' }, { key: 'acquirer', label: 'Acquirer' }]} />}
			</div>

			{roundup.isLoading ? <Loading /> : (
				<>
					{/* KPIs */}
					<div className="atlas-kpis atlas-kpis--pink">
						<Kpi k={mode === 'ma' ? 'M&A value' : 'Capital raised'} v={fmtUsd(total)} delta={deltaPct(s?.change?.total_amount)} />
						<Kpi k="Avg deal size" v={fmtUsd(avg)} delta={deltaPct(s?.change?.avg_amount)} note="disclosed rounds" />
						<Kpi k="Deals" v={fmtCount(count)} delta={deltaPct(s?.change?.count)} note={s ? `${fmtCount(s.disclosed_count)} disclosed` : undefined} />
					</div>

					{/* Summary */}
					{summary && (
						<div className="mkt-summary">
							<div className="mkt-summary-t">Summary</div>
							<div className="mkt-summary-b">{summary}</div>
						</div>
					)}

					{/* Donuts */}
					<div className="mkt-donuts">
						{donuts.map((d, di) => (
							<Card key={d.title} className="mkt-donut-card">
								<div className="atlas-chart-card__head">
									<div className="atlas-section-title">{d.title}</div>
									{di === 0
										? <Seg<SectorView> ariaLabel="Sector view" value={sectorView} onChange={setSectorView} options={[{ key: 'sector', label: 'Sector' }, { key: 'sub', label: 'Sub' }]} />
										: <div className="atlas-section-note">{metric === 'amount' ? 'By capital' : 'By deal count'}</div>}
								</div>
								{d.segments.length === 0 ? <div style={{ fontSize: 13, color: 'var(--a-faint)', padding: 18 }}>No data.</div> : d.zero ? (
									<div style={{ fontSize: 13, color: 'var(--a-faint)', padding: 18 }}>
										No disclosed {mode === 'ma' ? 'deal values' : 'amounts'} for these {fmtCount(d.rows.reduce((a, x) => a + x.deal_count, 0))} deals.{' '}
										<button type="button" onClick={() => setMetric('count')}
											style={{ background: 'none', border: 0, padding: 0, color: 'var(--a-navy)', cursor: 'pointer', font: 'inherit' }}>
											View by count
										</button>
									</div>
								) : (
									<>
										<div className="mkt-donut-chart">
											<PieDonut mode="donut" size={142} segments={d.segments} showLabelOnLargest={false} centerValue={d.total} centerLabel={d.unit} />
										</div>
										<div className="mkt-donut-legend"><PieLegend segments={d.segments.slice(0, 6)} /></div>
										{d.rows.length > 6 && (
											<button type="button" onClick={() => setBreakdown({ title: d.title, rows: d.rows })}
												style={{ marginTop: 8, background: 'none', border: 0, padding: 0, color: 'var(--a-navy)', cursor: 'pointer', font: 'inherit', fontSize: 12 }}>
												View full breakdown ({d.rows.length})
											</button>
										)}
									</>
								)}
							</Card>
						))}
					</div>

					{/* Largest deals table */}
					<Card style={{ padding: '0 23px' }}>
						<div className="atlas-section-head" style={{ padding: '16px 0 14px', alignItems: 'center' }}>
							<div className="atlas-section-title" style={{ fontSize: 16 }}>{mode === 'ma' ? 'Acquisitions this month' : 'Funding rounds this month'}</div>
							<span className="atlas-section-aside">
								All {mode === 'ma' ? 'acquisitions' : 'rounds'} for {monthName} {year}, sorted by {mode === 'ma' ? 'value' : 'amount'}
								{list && list.data.length > 0 && ` · Showing ${fmtCount(list.data.length)} of ${fmtCount(list.total ?? list.data.length)}`}
							</span>
						</div>
						{mode === 'funding' ? (
							deals.isLoading ? <Loading /> : (deals.data?.data.length ?? 0) === 0
								? <div style={{ fontSize: 13, color: 'var(--a-faint)', padding: '8px 0 16px' }}>No funding rounds recorded for {monthName} {year}.</div>
								: (
									<div className="atlas-table">
										<div className="atlas-table__head">
											<span className="atlas-table__rank">#</span>
											<span className="atlas-table__name">Company</span>
											<span className="atlas-table__col hide-sm" style={{ width: 150 }}>Location</span>
											<span className="atlas-table__col hide-sm" style={{ width: 150 }}>Round</span>
											<span className="atlas-table__amount" style={{ width: 90 }}>Amount</span>
										</div>
										{deals.data!.data.map((d, i) => (
											<div className="atlas-table__row" key={d.id}>
												<span className="atlas-table__rank">{i + 1}</span>
												<span className="atlas-table__name">{d.company_id ? <Link href={companyHref(d.company_slug ?? d.company_id)} className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{d.company_name ?? '—'}</Link> : <span className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{d.company_name ?? '—'}</span>}</span>
												<span className="atlas-table__col hide-sm" style={{ width: 150 }}>{[d.hq_city, d.hq_country].filter(Boolean).join(', ') || '—'}</span>
												<span className="atlas-table__col hide-sm" style={{ width: 150 }}>{d.round_type_name ?? '—'}</span>
												<span className="atlas-table__amount" style={{ width: 90 }}>{Number(d.amount_usd ?? 0) > 0 ? fmtUsd(Number(d.amount_usd)) : 'Undisclosed'}</span>
											</div>
										))}
									</div>
								)
						) : (
							acqs.isLoading ? <Loading /> : (acqs.data?.data.length ?? 0) === 0
								? <div style={{ fontSize: 13, color: 'var(--a-faint)', padding: '8px 0 16px' }}>No acquisitions recorded for {monthName} {year}.</div>
								: (
									<div className="atlas-table">
										<div className="atlas-table__head">
											<span className="atlas-table__rank">#</span>
											<span className="atlas-table__name">Company</span>
											<span className="atlas-table__col hide-sm" style={{ width: 170 }}>Acquirer</span>
											<span className="atlas-table__col hide-sm" style={{ width: 150 }}>Location</span>
											<span className="atlas-table__amount" style={{ width: 90 }}>Value</span>
										</div>
										{acqs.data!.data.map((a, i) => (
											<div className="atlas-table__row" key={a.id}>
												<span className="atlas-table__rank">{i + 1}</span>
												<span className="atlas-table__name">{a.acquiree_slug ? <Link href={companyHref(a.acquiree_slug)} className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{a.acquiree_name ?? '—'}</Link> : <span className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{a.acquiree_name ?? '—'}</span>}</span>
												<span className="atlas-table__col hide-sm atlas-ellipsis" style={{ width: 170 }}>{a.acquirer_name ?? '—'}</span>
												<span className="atlas-table__col hide-sm" style={{ width: 150 }}>{[a.hq_city, a.hq_country].filter(Boolean).join(', ') || '—'}</span>
												<span className="atlas-table__amount" style={{ width: 90 }}>{a.amount_usd == null || Number(a.amount_usd) === 0 ? 'Undisclosed' : fmtUsd(Number(a.amount_usd))}</span>
											</div>
										))}
									</div>
								)
						)}
					</Card>

					{/* News sections */}
					{sections.map(([sec, items]) => (
						<div className="mkt-news-sec" key={sec}>
							<div className="mkt-news-sec-h">{sec}</div>
							{items.map((it) => (
								<div className="mkt-news-item" key={it.id}>
									<div className="mkt-news-main">
										<div className="mkt-news-head">{it.headline}</div>
										{it.body && <div className="mkt-news-body">{it.body}</div>}
									</div>
									<div className="mkt-news-tags">
										{it.org && <span className="mkt-tag">{it.org}</span>}
										{it.geo && <span className="mkt-tag">{it.geo}</span>}
										{it.category && <Badge tone="navy">{it.category}</Badge>}
										{it.source_url && <a href={it.source_url} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: 'var(--a-navy)' }}>Source</a>}
									</div>
								</div>
							))}
						</div>
					))}

					{/* Archive */}
					<Card>
						<div className="atlas-section-head" style={{ marginBottom: 8 }}><div className="atlas-section-title">Archive</div><span className="atlas-section-aside">Last 12 months</span></div>
						<div className="mkt-archive">
							{archive.map((a) => (
								<div className="mkt-archive-row" key={`${a.year}-${a.month}`}>
									<span style={{ fontSize: 14, color: 'var(--a-ink)' }}>{a.label}</span>
									<button type="button" onClick={() => { setYear(a.year); setMonth(a.month); }}>View</button>
								</div>
							))}
						</div>
					</Card>
				</>
			)}

			{breakdown && (
				<Modal open onOpenChange={(o) => { if (!o) setBreakdown(null); }} title={breakdown.title} width={520}>
					<div style={{ display: 'grid', gap: 2, maxHeight: 440, overflowY: 'auto' }}>
						<div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px', gap: 10, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--a-faint)', padding: '2px 0 6px', borderBottom: '1px solid var(--a-border)' }}>
							<span>Name</span><span style={{ textAlign: 'right' }}>Deals</span><span style={{ textAlign: 'right' }}>Amount</span>
						</div>
						{breakdown.rows.map((r) => (
							<div key={r.label} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 110px', gap: 10, fontSize: 13, color: 'var(--a-ink)', padding: '7px 0', borderBottom: '1px solid var(--a-border)' }}>
								<span>{r.label}</span>
								<span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtCount(r.deal_count)}</span>
								<span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtUsd(r.total_amount)}</span>
							</div>
						))}
					</div>
				</Modal>
			)}
		</div>
	);
}

function Kpi({ k, v, delta, note }: { k: string; v: string; delta?: { text: string; dir: 'up' | 'down' | null } | null; note?: string }) {
	return (
		<div className="atlas-kpi">
			<div className="atlas-kpi__label">{k}</div>
			<div className="atlas-kpi__value">{v}</div>
			{delta && <div className={`atlas-kpi__note ${delta.dir ?? ''}`}>{delta.text} vs prev month</div>}
			{note && <div className="atlas-kpi__note">{note}</div>}
		</div>
	);
}

/** Server-computed month-over-month % → "+12.3%" (one decimal, IH style). */
function deltaPct(pct?: number): { text: string; dir: 'up' | 'down' | null } | null {
	if (pct == null || !Number.isFinite(pct)) return null;
	return { text: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, dir: pct > 0 ? 'up' : pct < 0 ? 'down' : null };
}
