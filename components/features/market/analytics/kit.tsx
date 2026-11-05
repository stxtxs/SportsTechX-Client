'use client';

import { useMemo, type ReactNode } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Zap, Briefcase, Users } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { companyHref } from '@/lib/routes';
import { Card, Loading, Seg, PillTabs, HBarDrilldown, ComboBarLine, Logo, Flag, FilterBar, BAR_ACCENT, type HBarRow, type FilterGroup } from '@/components/atlas';

/**
 * Shared pieces of the Analytics page's tabs — Atlas versions of the old
 * Intelligence Hub's report-charts (StatCard, SectionHeader, TimeFilter,
 * RegionFilter, YearBarChart, SectorBubbleChart, ReportTable).
 */

// ─── Payloads (server/src/modules/analytics/hub.repository.ts) ──────────────

export type Win = '10y' | '5y' | 'ytd';
/** 'custom' = the filtered base window; the hub showed it only while filters were active. */
export type WinOrCustom = Win | 'custom';
export const fetchWin = (w: WinOrCustom): Win => (w === 'custom' ? '10y' : w);

export interface HubYear { year: number; count: number; total_usd: number }
export interface HubDrill { sector: string; sub_sector: string | null; sub_sub_sector: string | null; total_usd: number; count: number }
export interface HubGroup { key: string; count: number; total_usd: number }
export interface HubPlace { country: string; city?: string; region: string | null; count: number; total_usd: number }
export interface HubCompany {
	company_id: string | null; name: string; website: string | null; slug: string | null; custom_logo_url: string | null;
	description?: string | null; sector: string | null; country: string | null; city: string | null; count: number; total_usd: number;
}
export interface HubDeepDive {
	yearly: HubYear[]; drill: HubDrill[]; models: HubGroup[]; countries: HubPlace[]; cities: HubPlace[];
	summary: { total_countries: number; total_cities: number }; top: HubCompany[];
}

// ─── Formatting (the hub's report-theme `fmt` / `fmtB`, from USD) ───────────

const strip = (s: string) => s.replace(/\.0$/, '');
/** `$340M` below a billion, `$1.2B` above — the hub's table/bar format. */
export const fmtM = (usd: number) => (usd >= 1e9 ? `$${strip((usd / 1e9).toFixed(1))}B` : `$${Math.round(usd / 1e6)}M`);
/** Always in billions (`$66.6B`) — the hub's stat-card format. */
export const fmtB = (usd: number) => `$${strip((usd / 1e9).toFixed(1))}B`;

/** The hub renamed the three framework pillars for display. */
const PILLAR: Record<string, string> = {
	'Activity & Performance': 'For Athletes',
	'Fans & Content': 'For Fans',
	'Management & Organisation': 'For Executives',
};
export const pillar = (s: string) => PILLAR[s] ?? s;
const PILLAR_ICON: Record<string, { Icon: typeof Zap; color: string }> = {
	'For Athletes': { Icon: Zap, color: 'var(--a-chart-1, #4F2484)' },
	'For Executives': { Icon: Briefcase, color: 'var(--a-chart-2, #1FCC96)' },
	'For Fans': { Icon: Users, color: 'var(--a-chart-3, #0482FF)' },
};

// ─── Controls ───────────────────────────────────────────────────────────────

/** The hub's TimeFilter: 10 YRS · 5 YRS · YTD, plus CUSTOM while filters are on. */
export function TimeToggle({ value, onChange, showCustom }: { value: WinOrCustom; onChange: (v: WinOrCustom) => void; showCustom?: boolean }) {
	const opts: { key: WinOrCustom; label: string }[] = [{ key: '10y', label: '10 yrs' }, { key: '5y', label: '5 yrs' }, { key: 'ytd', label: 'YTD' }];
	return <Seg<WinOrCustom> ariaLabel="Time range" value={value} onChange={onChange} options={showCustom ? [{ key: 'custom', label: 'Custom' }, ...opts] : opts} />;
}

export type Region = 'all' | 'NA' | 'EU' | 'APAC' | 'ROW';
/** The hub's RegionFilter over the country / city tables. */
export function RegionToggle({ value, onChange }: { value: Region; onChange: (v: Region) => void }) {
	return (
		<PillTabs<Region> ariaLabel="Region" value={value} onChange={onChange} options={[
			{ key: 'all', label: 'All' }, { key: 'NA', label: 'N. America' }, { key: 'EU', label: 'Europe' },
			{ key: 'APAC', label: 'Asia Pacific' }, { key: 'ROW', label: 'Rest of World' },
		]} />
	);
}

/** Last-N-years filter for the summary chart, applied client-side as the hub did. */
export function byWindow<T extends { year: number }>(rows: T[], w: WinOrCustom): T[] {
	const now = new Date().getFullYear();
	if (w === '5y') return rows.filter((r) => r.year >= now - 4);
	if (w === 'ytd') return rows.filter((r) => r.year === now);
	return rows;
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export function TabHead({ title, children }: { title: string; children?: ReactNode }) {
	return (
		<div className="atlas-controls">
			<div className="atlas-section-title">{title}</div>
			{children && <div className="ana-head-tools">{children}</div>}
		</div>
	);
}

export function Section({ title, note, right, children }: { title: ReactNode; note?: ReactNode; right?: ReactNode; children: ReactNode }) {
	return (
		<Card className="atlas-chart-card">
			<div className="atlas-chart-card__head ana-sec-head">
				<div style={{ minWidth: 0 }}>
					<div className="atlas-section-title">{title}</div>
					{note && <div className="atlas-section-note">{note}</div>}
				</div>
				{right && <div className="ana-sec-tools">{right}</div>}
			</div>
			<div className="atlas-chart-card__body">{children}</div>
		</Card>
	);
}

export function Tiles({ items, pink }: { items: { k: string; v: string; note?: string }[]; pink?: boolean }) {
	return (
		<div className={`atlas-kpis${pink ? ' atlas-kpis--pink' : ''}`}>
			{items.map((t) => (
				<div className="atlas-kpi" key={t.k}>
					<div className="atlas-kpi__label">{t.k}</div>
					<div className="atlas-kpi__value">{t.v}</div>
					<div className="atlas-kpi__note">{t.note}</div>
				</div>
			))}
		</div>
	);
}

export function NoData({ children = 'No data available' }: { children?: ReactNode }) {
	return <div className="ana-empty">{children}</div>;
}

/** Loading → empty → content, for one card body. */
export function Body({ loading, empty, children }: { loading: boolean; empty: boolean; children: ReactNode }) {
	if (loading) return <Loading />;
	if (empty) return <NoData />;
	return <>{children}</>;
}

// ─── Charts ─────────────────────────────────────────────────────────────────

/** The hub's YearBarChart: bars = value, line = count, one point per year with data. */
export function YearChart({ rows, barLabel, lineLabel }: { rows: { year: number; amt: number; deals: number }[]; barLabel: string; lineLabel: string }) {
	return (
		<ComboBarLine
			data={rows}
			valueFormatter={fmtM}
			barGradient
			barColors={['var(--a-chart-bar-top)', 'var(--a-chart-bar-bottom)']}
			lineColor="var(--a-chart-line)"
			dotColor="var(--a-chart-dot)"
			gridDashed={false}
			barLabel={barLabel}
			lineLabel={lineLabel}
		/>
	);
}

/** The hub's SectorBubbleChart: sector → sub-sector → sub-sub-sector, a missing
 *  level shown as "Other", shares of the whole. */
export function SectorDrill({ rows }: { rows: HubDrill[] }) {
	const tree = useMemo<HBarRow[]>(() => {
		const top = new Map<string, HBarRow & { kids: Map<string, HBarRow & { kids: Map<string, HBarRow> }> }>();
		for (const r of rows) {
			const s = top.get(r.sector) ?? { id: r.sector, label: pillar(r.sector), value: 0, kids: new Map() };
			s.value += r.total_usd; top.set(r.sector, s);
			const subKey = r.sub_sector ?? 'Other';
			const sub = s.kids.get(subKey) ?? { id: `${r.sector}::${subKey}`, label: subKey, value: 0, kids: new Map() };
			sub.value += r.total_usd; s.kids.set(subKey, sub);
			const leafKey = r.sub_sub_sector ?? 'Other';
			const leaf = sub.kids.get(leafKey) ?? { id: `${sub.id}::${leafKey}`, label: leafKey, value: 0 };
			leaf.value += r.total_usd; sub.kids.set(leafKey, leaf);
		}
		const desc = (a: HBarRow, b: HBarRow) => b.value - a.value;
		return [...top.values()].sort(desc).map((s) => ({
			id: s.id, label: s.label, value: s.value, formatted: fmtM(s.value), color: BAR_ACCENT,
			children: [...s.kids.values()].sort(desc).map((sub) => ({
				id: sub.id, label: sub.label, value: sub.value, formatted: fmtM(sub.value),
				children: [...sub.kids.values()].sort(desc).map((l) => ({ id: l.id, label: l.label, value: l.value, formatted: fmtM(l.value) })),
			})),
		}));
	}, [rows]);
	return (
		<>
			<div className="atlas-drilldown"><HBarDrilldown rows={tree} /></div>
			<Link href="/framework" className="ana-framework-link">Understand the Framework →</Link>
		</>
	);
}

/** Business-model share bars (label · % · value). */
export function ModelBars({ rows }: { rows: HubGroup[] }) {
	return (
		<div className="atlas-drilldown">
			<HBarDrilldown rows={rows.map((r) => ({ id: r.key, label: r.key, value: r.total_usd, formatted: fmtM(r.total_usd), color: BAR_ACCENT }))} />
		</div>
	);
}

// ─── Tables ─────────────────────────────────────────────────────────────────

function Head({ cols }: { cols: ReactNode[] }) {
	return <div className="atlas-table__head">{cols}</div>;
}

/** Countries | Cities, top 10 each after the region filter. */
export function PlaceTables({ countries, cities, region, countLabel }: { countries: HubPlace[]; cities: HubPlace[]; region: Region; countLabel: string }) {
	const pick = (rows: HubPlace[]) => (region === 'all' ? rows : rows.filter((r) => r.region === region)).slice(0, 10);
	const table = (title: string, rows: HubPlace[], name: (r: HubPlace) => string) => (
		<div style={{ minWidth: 0 }}>
			<div className="ana-subhead">{title}</div>
			{rows.length === 0 ? <NoData /> : (
				<div className="atlas-table ana-table">
					<Head cols={[<span key="r" className="atlas-table__rank">#</span>, <span key="n" className="atlas-table__name">{title === 'Countries' ? 'Country' : 'City'}</span>,
						<span key="a" className="atlas-table__amount">Amount</span>, <span key="c" className="atlas-table__col ana-count">{countLabel}</span>]} />
					{rows.map((r, i) => (
						<div className="atlas-table__row" key={`${r.city ?? ''}|${r.country}`}>
							<span className="atlas-table__rank">{i + 1}</span>
							<span className="atlas-table__name"><Flag cc={r.country} size={16} /><span className="atlas-ellipsis">{name(r)}</span></span>
							<span className="atlas-table__amount">{fmtM(r.total_usd)}</span>
							<span className="atlas-table__col ana-count">{r.count.toLocaleString()}</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
	return (
		<div className="ana-two">
			{table('Countries', pick(countries), (r) => r.country)}
			{table('Cities', pick(cities), (r) => r.city ?? '')}
		</div>
	);
}

/** Top companies: #, Company (logo, pillar icon, description), Location, Amount, count. */
export function CompanyTable({ rows, countLabel, pillarIcons }: { rows: HubCompany[]; countLabel: string; pillarIcons?: boolean }) {
	if (rows.length === 0) return <NoData />;
	return (
		<>
			{pillarIcons && (
				<div className="ana-legend">
					{Object.entries(PILLAR_ICON).map(([label, { Icon, color }]) => (
						<span key={label}><Icon size={12} color={color} aria-hidden="true" />{label}</span>
					))}
				</div>
			)}
			<div className="atlas-table ana-table">
				<Head cols={[<span key="r" className="atlas-table__rank">#</span>, <span key="n" className="atlas-table__name">Company</span>,
					<span key="l" className="atlas-table__col ana-loc hide-sm">Location</span>, <span key="a" className="atlas-table__amount">Amount</span>,
					<span key="c" className="atlas-table__col ana-count">{countLabel}</span>]} />
				{rows.map((c, i) => {
					const icon = pillarIcons && c.sector ? PILLAR_ICON[pillar(c.sector)] : undefined;
					const ref = c.slug ?? c.company_id;
					const name = <span className="atlas-ellipsis ana-co-name">{c.name}</span>;
					return (
						<div className="atlas-table__row" key={`${c.company_id ?? c.name}-${i}`}>
							<span className="atlas-table__rank">{i + 1}</span>
							<div className="atlas-table__name">
								<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={28} />
								<div className="atlas-table__name-main">
									<div className="ana-co-line">
										{ref ? <Link href={companyHref(ref)} className="ana-co-link">{name}</Link> : name}
										{icon && <icon.Icon size={13} color={icon.color} aria-label={pillar(c.sector!)} />}
									</div>
									{c.description && <div className="atlas-ellipsis ana-co-desc">{c.description}</div>}
								</div>
							</div>
							<span className="atlas-table__col ana-loc hide-sm">
								{(c.country || c.city) && <><Flag cc={c.country} size={14} /> {c.city ?? ''}</>}
							</span>
							<span className="atlas-table__amount">{fmtM(c.total_usd)}</span>
							<span className="atlas-table__col ana-count">{c.count.toLocaleString()}</span>
						</div>
					);
				})}
			</div>
		</>
	);
}

// ─── Filters (the hub's filter panel, as an Atlas filter bar) ───────────────

export type FilterState = Record<string, string>;

/** Reference options keyed by id: sector tiers, countries, round types. */
export function useHubOptions() {
	const sectors = useSWR<Array<{ id: string; name: string; parent_id: string | null }>>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const countries = useSWR<Array<{ id: string; name: string }>>(qk.reference.countries(), { dedupingInterval: 60 * 60_000 });
	const rounds = useSWR<Array<{ id: string; name: string }>>(qk.reference.roundTypes(), { dedupingInterval: 60 * 60_000 });
	return useMemo(() => {
		const list = Array.isArray(sectors.data) ? sectors.data : [];
		const byId = new Map(list.map((s) => [s.id, s]));
		const depth = (s: { parent_id: string | null }) => { let d = 0; let p = s.parent_id; while (p && d < 6) { d++; p = byId.get(p)?.parent_id ?? null; } return d; };
		const tier = (d: number): [string, string][] => list.filter((s) => depth(s) === d)
			.map((s) => [s.id, d === 0 ? pillar(s.name) : s.name] as [string, string]).sort((a, b) => a[1].localeCompare(b[1]));
		const named = (rows?: Array<{ id: string; name: string }>) => (Array.isArray(rows) ? rows : []).map((r) => [r.id, r.name] as [string, string]);
		const now = new Date().getFullYear();
		return {
			sector: tier(0), subSector: tier(1), subSubSector: tier(2),
			country: named(countries.data).sort((a, b) => a[1].localeCompare(b[1])),
			roundType: named(rounds.data),
			year: Array.from({ length: 11 }, (_, i) => String(now - i)).map((y) => [y, y] as [string, string]),
			quarter: [1, 2, 3, 4].map((q) => [String(q), `Q${q}`] as [string, string]),
			businessModel: [['b2c', 'B2C'], ['b2b', 'B2B'], ['b2b2c', 'B2B2C'], ['d2c', 'D2C'], ['b2g', 'B2G'], ['other', 'Other']] as [string, string][],
		};
	}, [sectors.data, countries.data, rounds.data]);
}

export function HubFilters({ groups, active, onClear }: { groups: FilterGroup[]; active: boolean; onClear: () => void }) {
	return <FilterBar groups={groups} canClear={active} onClear={onClear} />;
}

/** One single-select filter over a FilterState. */
export function sel(state: FilterState, set: (s: FilterState) => void, key: string, label: string, options: [string, string][]) {
	return { kind: 'select' as const, key, label, options, value: state[key] ?? '', onChange: (v: string) => set({ ...state, [key]: v }) };
}
export function flag(state: FilterState, set: (s: FilterState) => void, key: string, label: string) {
	return { kind: 'toggle' as const, key, label, value: state[key] === 'true', onChange: (v: boolean) => set({ ...state, [key]: v ? 'true' : '' }) };
}
/** The filter state as request params (empty values dropped by the fetcher). */
export const asParams = (state: FilterState) => Object.fromEntries(Object.entries(state).filter(([, v]) => v));
export const isActive = (state: FilterState) => Object.values(state).some(Boolean);
