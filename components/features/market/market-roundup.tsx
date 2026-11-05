'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { Card, Loading, Badge, Seg, Tabs } from '@/components/atlas';
import { Combobox } from '@/components/atlas/ui/combobox';
import { MONTHS } from '@/lib/catalog-options';
import { PieCard } from './roundup/pie-card';
import { FundingRoundsTable, MaDealsTable } from './roundup/roundup-tables';
import { fmtM, fmtChange, ihGroups, type Grouping, type Perspective, type RoundupMode } from './roundup/roundup-format';
import './market.css';

interface RoundupStats {
	total_amount: number; count: number; avg_amount: number;
	/** Month-over-month % (server applies the IH rule for an empty previous month). */
	change: { total_amount: number; avg_amount: number; count: number };
}
interface NewsItem {
	id: string; section: string; category: string | null; headline: string;
	body: string | null; org: string | null; geo: string | null; source_url: string | null;
}
interface Roundup {
	year: number; month: number; mode: RoundupMode; perspective?: Perspective;
	edition: { title: string | null; summary: string | null } | null;
	news: NewsItem[]; stats: RoundupStats;
	by_sector: Grouping[]; by_sub_sector?: Grouping[]; by_business_model: Grouping[]; by_geo: Grouping[];
}

/** IH year picker: current year + the 10 before it. */
const YEARS: [string, string][] = Array.from({ length: 11 }, (_, i) => {
	const y = String(new Date().getUTCFullYear() - i);
	return [y, y];
});

/**
 * Intelligence → Monthly Roundup. A port of the old Intelligence Hub
 * /analytics "Monthly Roundup" tab: Funding / M&A tabs with month + year
 * pickers (and the M&A Acquiree/Acquirer toggle) in one filter card, three IH
 * stat cards, three full pies (Sector/Sub Sector, Business Model, Country top
 * 10) each with its own Amount/Count toggle and Complete Breakdown table, then
 * the month's deal table. Numbers come from /api/market/roundup (IH math);
 * the published editorial header sits above and curated news below, outside
 * the IH structure.
 */
export function MarketRoundup() {
	const [mode, setModeRaw] = useState<RoundupMode>('funding');
	const [perspective, setPerspective] = useState<Perspective>('acquiree');
	const [sectorView, setSectorView] = useState<'sector' | 'sub'>('sector');
	// `null` = "whatever the server says is the latest month with data" (ingest
	// lags, so the previous calendar month is often empty). The server echoes
	// the month it chose.
	const [sel, setSel] = useState<{ year: number; month: number } | null>(null);

	const roundup = useSWR<Roundup>(qk.market.roundup({ ...(sel ?? {}), mode, ...(mode === 'ma' ? { perspective } : {}) }));
	const shown = sel ?? (roundup.data ? { year: roundup.data.year, month: roundup.data.month } : null);
	const year = shown?.year ?? new Date().getUTCFullYear();
	const month = shown?.month ?? 1;
	// IH keeps one month across both tabs: pin the resolved month before switching.
	const setMode = (m: RoundupMode) => { if (!sel && shown) setSel(shown); setModeRaw(m); };

	const d = roundup.data;
	const s = d?.stats;
	const noun = mode === 'ma' ? 'M&A' : 'Funding';
	// Funding opens every pie on Amount, M&A on Count (most M&A values are undisclosed) — IH defaults.
	const defMetric = mode === 'ma' ? 'count' : 'amount';
	const groups = useMemo(() => ({
		sector: ihGroups(d?.by_sector, true),
		sub: ihGroups(d?.by_sub_sector ?? d?.by_sector),
		bm: ihGroups(d?.by_business_model),
		geo: ihGroups(d?.by_geo),
	}), [d]);

	const sections = useMemo(() => {
		const map = new Map<string, NewsItem[]>();
		for (const n of d?.news ?? []) map.set(n.section, [...(map.get(n.section) ?? []), n]);
		return [...map.entries()];
	}, [d]);

	return (
		<div style={{ display: 'grid', gap: 24 }}>
			{/* Published editorial header (Atlas addition; IH had none). */}
			{d?.edition && (d.edition.title || d.edition.summary) && (
				<div className="mkt-summary">
					{d.edition.title && <div className="mkt-summary-t">{d.edition.title}</div>}
					{d.edition.summary && <div className="mkt-summary-b">{d.edition.summary}</div>}
				</div>
			)}

			{/* IH filter row: Funding / M&A, month, year, M&A perspective. */}
			<Card style={{ padding: '14px 24px' }}>
				<div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
					<Tabs<RoundupMode> value={mode} onChange={setMode} tabs={[{ key: 'funding', label: 'Funding' }, { key: 'ma', label: 'M&A' }]} />
					<Combobox className="atlas-select atlas-select--pill" ariaLabel="Month" value={String(month)} onChange={(v) => setSel({ year, month: Number(v) })} style={{ width: 150 }} options={MONTHS} />
					<Combobox className="atlas-select atlas-select--pill" ariaLabel="Year" value={String(year)} onChange={(v) => setSel({ year: Number(v), month })} style={{ width: 110 }} options={YEARS} />
					{mode === 'ma' && <Seg<Perspective> ariaLabel="Perspective" value={perspective} onChange={setPerspective} options={[{ key: 'acquiree', label: 'Acquiree' }, { key: 'acquirer', label: 'Acquirer' }]} />}
				</div>
			</Card>

			{roundup.isLoading || !s ? <Loading /> : (
				<>
					<div className="atlas-kpis atlas-kpis--pink" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))' }}>
						<Kpi k={mode === 'ma' ? 'M&A Value (Disclosed)' : 'Total Funding'} v={fmtM(s.total_amount)} pct={s.change?.total_amount} />
						<Kpi k={mode === 'ma' ? 'Avg M&A (Disclosed)' : 'Avg Funding'} v={fmtM(s.avg_amount)} pct={s.change?.avg_amount} />
						<Kpi k={mode === 'ma' ? 'M&A Deal Count' : 'Deal Count'} v={String(s.count)} pct={s.change?.count} />
					</div>

					{/* Keyed by mode so each tab opens on its own IH default metric. */}
					<div className="mkt-donuts">
						<PieCard
							key={`${mode}-sector`} mode={mode} defaultMetric={defMetric}
							title={`${noun} by ${sectorView === 'sector' ? 'Sector' : 'Sub Sector'}`}
							plural={sectorView === 'sector' ? 'sectors' : 'sub sectors'}
							dimension={sectorView === 'sector' ? 'Sector' : 'Sub Sector'}
							rows={sectorView === 'sector' ? groups.sector : groups.sub}
							extra={<Seg<'sector' | 'sub'> ariaLabel="Sector view" value={sectorView} onChange={setSectorView} options={[{ key: 'sector', label: 'Sector' }, { key: 'sub', label: 'Sub Sector' }]} />}
						/>
						<PieCard key={`${mode}-bm`} mode={mode} defaultMetric={defMetric} title={`${noun} by Business Model`} plural="business models" dimension="Business Model" rows={groups.bm} />
						<PieCard key={`${mode}-geo`} mode={mode} defaultMetric={defMetric} title={`${noun} by Country`} plural="countries" dimension="Country" rows={groups.geo} top={10} />
					</div>

					{mode === 'ma' ? <MaDealsTable year={year} month={month} /> : <FundingRoundsTable year={year} month={month} />}

					{/* Curated news for the month (Atlas addition; IH had none). */}
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
				</>
			)}
		</div>
	);
}

function Kpi({ k, v, pct }: { k: string; v: string; pct?: number }) {
	const dir = pct == null ? '' : pct > 0 ? 'up' : pct < 0 ? 'down' : '';
	return (
		<div className="atlas-kpi">
			<div className="atlas-kpi__label">{k}</div>
			<div className="atlas-kpi__value">{v}</div>
			<div className={`atlas-kpi__note ${dir}`}>{fmtChange(pct)}</div>
		</div>
	);
}
