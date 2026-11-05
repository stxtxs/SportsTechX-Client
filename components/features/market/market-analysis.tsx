'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import Link from 'next/link';
import { Card, Loading, Logo, ComboBarLine, PieDonut, HBarDrilldown, type ComboPoint, type PieSegment, type HBarRow, Seg, barAt, BAR_ACCENT } from '@/components/atlas';
import { companyHref } from '@/lib/routes';
import { fmtUsd, fmtUsdB, fmtCount } from './format';

type Series = 'funding' | 'ma' | 'total';
type Range = '10y' | '5y' | 'ytd';

interface Amt { deal_count: number; total_amount: number }
interface AnnualPoint { year: number; total_amount: number; deal_count: number }
interface TreeLeaf extends Amt { sector_id: string; sector_name: string }
interface TreeNode extends TreeLeaf { children: TreeLeaf[] }
interface BizRow extends Amt { business_model: string }
interface GeoRow extends Amt { country: string }
interface TopFunded { company_id: string; name: string; slug: string | null; website?: string | null; custom_logo_url: string | null; total_raised: number; deal_count: number }
interface TopAcquirer { acquirer_name: string; acquirer_country: string | null; acquirer_website?: string | null; acquirer_logo?: string | null; acquirer_slug?: string | null; deal_count: number; total_value: number }

const BAR_TOP = 'var(--a-chart-bar-top)';
const BAR_BOTTOM = 'var(--a-chart-bar-bottom)';
const GEO_TOP = 8;

/** Sum rows sharing a key (funding + M&A on "Total"), largest first. */
function sumBy<T extends Amt>(rows: T[], key: (r: T) => string, merge?: (a: T, b: T) => T): T[] {
	const m = new Map<string, T>();
	for (const r of rows) {
		const k = key(r), cur = m.get(k);
		m.set(k, cur ? { ...(merge ? merge(cur, r) : cur), deal_count: cur.deal_count + r.deal_count, total_amount: cur.total_amount + r.total_amount } : r);
	}
	return [...m.values()].sort((a, b) => b.total_amount - a.total_amount);
}

const both = <T,>(f?: T[], m?: T[]): T[] => [...(f ?? []), ...(m ?? [])];
const modelLabel = (m: string) => (m === 'Unclassified' ? m : m === 'other' ? 'Other' : m.toUpperCase());

/**
 * Market → Analysis. General sports-tech market analytics from the public
 * /api/analytics/* endpoints: a funding/M&A/total combo chart over time, a
 * sector drill-down, business-model + geography breakdowns, and a top table.
 *
 * Every card uses the SAME calendar-year window as the tiles and combo chart
 * (`from`–`to`, YTD = this year), so the breakdowns sum to the tiles. M&A cards
 * group acquisitions by the acquired company; "Total" adds funding and M&A.
 */
export function MarketAnalysis() {
	const [series, setSeries] = useState<Series>('funding');
	const [range, setRange] = useState<Range>('10y');

	const now = new Date().getUTCFullYear();
	const to = now;
	const from = range === 'ytd' ? now : range === '5y' ? now - 4 : now - 9;
	// `from`/`to` override `period` server-side; period stays for its prior-window semantics.
	const win = { period: range === 'ytd' ? 'ytd' : 'all', from, to } as const;
	const key = (path: string, extra: Record<string, unknown> = {}) => [`/api/analytics/${path}`, { ...win, ...extra }] as const;
	const needF = series !== 'ma';
	const needM = series !== 'funding';

	const funding = useSWR<AnnualPoint[]>(qk.analytics.annualFunding({ from, to }));
	const ma = useSWR<AnnualPoint[]>(qk.analytics.annualMa({ from, to }));
	const fTree = useSWR<TreeNode[]>(needF ? key('sector-heat-tree', { limit: 8 }) : null);
	const mTree = useSWR<TreeNode[]>(needM ? key('ma-sector-heat-tree', { limit: 8 }) : null);
	const fBiz = useSWR<BizRow[]>(needF ? key('business-model-breakdown') : null);
	const mBiz = useSWR<BizRow[]>(needM ? key('ma-business-model-breakdown') : null);
	const fGeo = useSWR<GeoRow[]>(needF ? key('world-flow', { limit: 30 }) : null);
	const mGeo = useSWR<GeoRow[]>(needM ? key('ma-world-flow', { limit: 30 }) : null);
	const topFunded = useSWR<TopFunded[]>(series === 'funding' ? key('top-funded-companies', { limit: 10 }) : null);
	const topAcq = useSWR<TopAcquirer[]>(series === 'ma' ? key('top-acquirers', { limit: 10 }) : null);

	const seriesLabel = series === 'ma' ? 'M&A' : series === 'total' ? 'Total' : 'Funding';
	const lineLabel = series === 'ma' ? 'Deals' : 'Rounds';

	// Merge funding + M&A per year → the chart points for the active series.
	const chartData = useMemo<ComboPoint[]>(() => {
		const f = new Map((funding.data ?? []).map((r) => [r.year, r]));
		const m = new Map((ma.data ?? []).map((r) => [r.year, r]));
		const years: number[] = [];
		for (let y = from; y <= to; y++) years.push(y);
		return years.map((y) => {
			const fr = f.get(y); const mr = m.get(y);
			if (series === 'funding') return { year: y, amt: fr?.total_amount ?? 0, deals: fr?.deal_count ?? 0 };
			if (series === 'ma') return { year: y, amt: mr?.total_amount ?? 0, deals: mr?.deal_count ?? 0 };
			return { year: y, amt: (fr?.total_amount ?? 0) + (mr?.total_amount ?? 0), deals: (fr?.deal_count ?? 0) + (mr?.deal_count ?? 0) };
		});
	}, [funding.data, ma.data, series, from, to]);

	const stats = useMemo(() => {
		const grand = chartData.reduce((s, d) => s + d.amt, 0);
		const deals = chartData.reduce((s, d) => s + d.deals, 0);
		const last = chartData[chartData.length - 1];
		const fundTotal = (funding.data ?? []).reduce((s, r) => s + r.total_amount, 0);
		const maTotal = (ma.data ?? []).reduce((s, r) => s + r.total_amount, 0);
		const maShare = fundTotal + maTotal > 0 ? Math.round((maTotal / (fundTotal + maTotal)) * 100) : 0;
		return { grand, deals, last, maShare };
	}, [chartData, funding.data, ma.data]);

	// The active series' rows: funding, M&A, or both summed ("Total"). A key
	// that isn't fetched has no data, so the same merge serves all three.
	const treeRows = useMemo<HBarRow[]>(() => sumBy(
		both(fTree.data, mTree.data), (n) => n.sector_id,
		(a, b) => ({ ...a, children: sumBy([...a.children, ...b.children], (c) => c.sector_id) }),
	).map((n, i) => ({
		id: n.sector_id,
		label: n.sector_name,
		value: n.total_amount,
		formatted: fmtUsd(n.total_amount),
		color: barAt(i),
		children: (n.children ?? []).map((c) => ({ id: c.sector_id, label: c.sector_name, value: c.total_amount, formatted: fmtUsd(c.total_amount) })),
	})), [fTree.data, mTree.data]);

	const bizSegments = useMemo<PieSegment[]>(() => sumBy(both(fBiz.data, mBiz.data), (r) => r.business_model).map((r) => ({
		name: modelLabel(r.business_model), v: r.total_amount, color: BAR_ACCENT, label: fmtUsd(r.total_amount),
	})), [fBiz.data, mBiz.data]);
	const geoSegments = useMemo<PieSegment[]>(() => sumBy(both(fGeo.data, mGeo.data), (r) => r.country).slice(0, GEO_TOP).map((r) => ({
		name: r.country, v: r.total_amount, color: BAR_ACCENT, label: fmtUsd(r.total_amount),
	})), [fGeo.data, mGeo.data]);

	const loadingCore = funding.isLoading || ma.isLoading;
	const what = series === 'ma' ? 'acquired companies' : series === 'total' ? 'funded and acquired companies' : 'funded companies';

	return (
		// minmax(0, 1fr): an implicit `auto` track grows to its widest child's
		// min-content, which pushed the whole page to 513px on a 390px phone.
		<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 22 }}>
			{/* Controls */}
			<div className="atlas-controls">
				<Seg<Series>
					ariaLabel="Series" value={series} onChange={setSeries}
					options={[{ key: 'funding', label: 'Funding' }, { key: 'ma', label: 'M&A' }, { key: 'total', label: 'Total' }]}
				/>
				<Seg<Range>
					ariaLabel="Range" value={range} onChange={setRange}
					options={[{ key: '10y', label: '10 yrs' }, { key: '5y', label: '5 yrs' }, { key: 'ytd', label: 'YTD' }]}
				/>
			</div>

			{/* KPIs — pink highlight, matching the Figma Market frames (and Roundup). */}
			<div className="atlas-kpis atlas-kpis--pink">
				<Kpi k={`Total ${series === 'ma' ? 'M&A value' : series === 'total' ? 'capital' : 'funding'}`} v={fmtUsd(stats.grand)} note={rangeLabel(range)} />
				<Kpi k="Latest year" v={fmtUsd(stats.last?.amt)} note={stats.last ? `${stats.last.year} · ${fmtCount(stats.last.deals)} ${lineLabel.toLowerCase()}` : '—'} />
				<Kpi k={series === 'ma' ? 'Deals recorded' : 'Rounds recorded'} v={fmtCount(stats.deals)} note={rangeLabel(range)} />
				{series === 'total'
					? <Kpi k="M&A share of value" v={`${stats.maShare}%`} note="of total capital" />
					: <Kpi k="Years covered" v={String(chartData.length)} note={`${from}–${to}`} />}
			</div>

			{/* Combo chart */}
			<Card className="atlas-chart-card">
				<div className="atlas-chart-card__head">
					<div className="atlas-section-title">{seriesLabel} summary ($B)</div>
					<div className="atlas-section-note">Bars = {series === 'total' ? 'funding + M&A' : seriesLabel.toLowerCase()} value ($B) · Line = {lineLabel.toLowerCase()} · {rangeLabel(range)}</div>
				</div>
				<div className="atlas-chart-card__body">
					{loadingCore ? <Loading /> : (
						<ComboBarLine
							data={chartData}
							valueFormatter={fmtUsdB}
							barGradient
							barColors={[BAR_TOP, BAR_BOTTOM]}
							lineColor="var(--a-chart-line)"
							dotColor="var(--a-chart-dot)"
							showValues={false}
							gridDashed={false}
							barLabel={series === 'total' ? 'Value' : seriesLabel}
							lineLabel={lineLabel}
						/>
					)}
				</div>
			</Card>

			{/* Sector tree */}
			<Card className="atlas-chart-card">
				<div className="atlas-chart-card__head">
					<div className="atlas-section-title">{seriesLabel} by sector</div>
					<div className="atlas-section-note">Drill down into sector and sub-sector value · {rangeLabel(range)}</div>
				</div>
				<div className="atlas-chart-card__body" style={{ paddingTop: 20, paddingBottom: 20 }}>
					{fTree.isLoading || mTree.isLoading ? <Loading /> : treeRows.length === 0
						? <NoData />
						: <div className="atlas-drilldown"><HBarDrilldown rows={treeRows} /></div>}
				</div>
			</Card>

			{/* Breakdowns */}
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 27, alignItems: 'start' }}>
				<Card>
					<div className="atlas-section-title">{seriesLabel} by business model</div>
					<div className="atlas-section-note">How value splits across business models</div>
					{fBiz.isLoading || mBiz.isLoading ? <Loading /> : bizSegments.length === 0 ? <NoData /> : <PieDonut mode="bar" segments={bizSegments} />}
				</Card>
				<Card>
					<div className="atlas-section-title">{seriesLabel} by geography</div>
					<div className="atlas-section-note">Where the {what} are based (top countries)</div>
					{fGeo.isLoading || mGeo.isLoading ? <Loading /> : geoSegments.length === 0 ? <NoData /> : <PieDonut mode="bar" segments={geoSegments} />}
				</Card>
			</div>

			{/* Top table (hidden on Total) */}
			{series !== 'total' && (
				<Card style={{ padding: '0 23px' }}>
					<div className="atlas-section-head" style={{ padding: '14px 0 12px' }}>
						<div className="atlas-section-title" style={{ fontSize: 16 }}>{series === 'ma' ? 'Largest acquirers' : 'Top funded companies'}</div>
					</div>
					{(series === 'funding' ? topFunded.isLoading : topAcq.isLoading) ? <Loading />
						: ((series === 'funding' ? topFunded.data : topAcq.data) ?? []).length === 0 ? <NoData pad />
						: (
						<div className="atlas-table">
							{series === 'funding'
								? (topFunded.data ?? []).map((c, i) => (
									<Link className="atlas-table__row" key={c.company_id} href={companyHref(c.slug ?? c.company_id)}>
										<span className="atlas-table__rank">{i + 1}</span>
										<div className="atlas-table__name">
											<Logo co={{ name: c.name, website: c.website ?? null, custom_logo_url: c.custom_logo_url }} size={28} />
											<div className="atlas-table__name-main"><div className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{c.name}</div></div>
										</div>
										<span className="atlas-table__col hide-sm">{fmtCount(c.deal_count)} rounds</span>
										<span className="atlas-table__amount">{fmtUsd(c.total_raised)}</span>
									</Link>
								))
								: (topAcq.data ?? []).map((a, i) => (
									<div className="atlas-table__row" key={`${a.acquirer_name}-${i}`}>
										<span className="atlas-table__rank">{i + 1}</span>
										<div className="atlas-table__name"><Logo co={{ name: a.acquirer_name, website: a.acquirer_website ?? null, custom_logo_url: a.acquirer_logo ?? null }} size={28} /><div className="atlas-table__name-main">{a.acquirer_slug
											? <Link href={companyHref(a.acquirer_slug)} className="atlas-ellipsis" style={{ display: 'block', fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15, color: 'inherit', textDecoration: 'none' }}>{a.acquirer_name}</Link>
											: <div className="atlas-ellipsis" style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15 }}>{a.acquirer_name}</div>}{a.acquirer_country && <div style={{ fontFamily: 'var(--a-body)', fontSize: 10, color: 'var(--a-muted)', marginTop: 3 }}>{a.acquirer_country}</div>}</div></div>
										<span className="atlas-table__col hide-sm">{fmtCount(a.deal_count)} deals</span>
										<span className="atlas-table__amount">{fmtUsd(a.total_value)}</span>
									</div>
								))}
						</div>
					)}
				</Card>
			)}

			<div style={{ fontSize: 12, color: 'var(--a-faint)' }}>Figures cover disclosed deals only. Source: SportsTechX research.</div>
		</div>
	);
}

function NoData({ pad }: { pad?: boolean }) {
	return <div style={{ fontSize: 13, color: 'var(--a-faint)', padding: pad ? '4px 0 18px' : '14px 0 0' }}>No data for this period.</div>;
}

function Kpi({ k, v, note }: { k: string; v: string; note?: string }) {
	return (
		<div className="atlas-kpi">
			<div className="atlas-kpi__label">{k}</div>
			<div className="atlas-kpi__value">{v}</div>
			<div className="atlas-kpi__note">{note}</div>
		</div>
	);
}

function rangeLabel(r: Range): string {
	return r === 'ytd' ? 'Year to date' : r === '5y' ? 'Last 5 years' : 'Last 10 years';
}
