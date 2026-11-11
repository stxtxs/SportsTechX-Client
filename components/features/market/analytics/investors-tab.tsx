'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Button, Select } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { companyHref } from '@/lib/routes';
import {
	TabHead, Section, Tiles, Body, YearChart, TimeToggle, HubFilters, NoData,
	useHubOptions, sel, flag, asParams, isActive, byWindow, fmtM,
	type FilterState, type Win, type WinOrCustom,
} from './kit';

interface Investors {
	summary: { total_investors: number; total_usd: number };
	yearly: { year: number; total_usd: number; investors: number }[];
	top: { investor: string; count: number; latest_company: string | null; latest_slug: string | null; latest_date: string | null; latest_usd: number }[];
}

const PAGE = 10;
const monthYear = (d: string | null) => (d ? new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—');
/** The hub's investor-tab funding format: `$1.2B`, else `$340M`. */
const fmtFunding = (usd: number) => (usd >= 1e9 ? `$${(usd / 1e9).toFixed(1).replace(/\.0$/, '')}B` : `$${Math.round(usd / 1e6)}M`);

/** Hub Investors Deep Dive (investors-analytics-tab.tsx): two stats, yearly
 *  funding vs unique investors, and the top-50 investors table (10 per page). */
export function InvestorsTab() {
	const [filters, setFilters] = useState<FilterState>({});
	const [summaryRange, setSummaryRange] = useState<WinOrCustom>('10y');
	const [listRange, setListRange] = useState<Win>('10y');
	const [page, setPage] = useState(0);
	const active = isActive(filters);
	const year = filters.dealYear ?? '';

	const key = (win: Win) => qk.analytics.hub.investors({ window: win, ...asParams(filters) });
	const base = useSWR<Investors>(key('10y'));
	// A picked year already narrows the whole tab, so the list uses the base window.
	const list = useSWR<Investors>(key(year ? '10y' : listRange));
	// The year picker's own options come from the tab WITHOUT the picked year, or
	// choosing one would leave only that year to choose from. Same key as `base`
	// when no year is picked, so it costs no extra request.
	const allYears = useSWR<Investors>(qk.analytics.hub.investors({ window: '10y', ...asParams({ ...filters, dealYear: '' }) }));

	const opts = useHubOptions();
	const setAndReset = (f: FilterState) => { setFilters(f); setPage(0); };
	const groups = [{
		label: 'Filters',
		filters: [
			sel(filters, setAndReset, 'sector', 'Sector', opts.sector),
			sel(filters, setAndReset, 'subSector', 'Sub-sector', opts.subSector),
			sel(filters, setAndReset, 'subSubSector', 'Sub-sub-sector', opts.subSubSector),
			sel(filters, setAndReset, 'businessModel', 'Business model', opts.businessModel),
			sel(filters, setAndReset, 'country', 'Country', opts.country),
			sel(filters, setAndReset, 'roundType', 'Funding round', opts.roundType),
			sel(filters, setAndReset, 'dealYear', 'Deal year', opts.year),
			sel(filters, setAndReset, 'dealQuarter', 'Deal quarter', opts.quarter),
			sel(filters, setAndReset, 'dealSize', 'Deal size', [['under_1m', '< $1M'], ['from_1m_to_10m', '$1M – $10M'], ['from_10m_to_100m', '$10M – $100M'], ['over_100m', '> $100M']]),
			flag(filters, setAndReset, 'disclosed', 'Disclosed amounts only'),
		],
	}];

	const yearly = useMemo(() => base.data?.yearly ?? [], [base.data]);
	const chart = useMemo(() => byWindow(yearly, summaryRange).map((r) => ({ year: r.year, amt: r.total_usd, deals: r.investors })), [yearly, summaryRange]);
	const yearOptions = useMemo(() => [...new Set((allYears.data?.yearly ?? []).map((r) => r.year))].sort((a, b) => b - a).map((y) => [String(y), String(y)] as [string, string]), [allYears.data]);

	const rows = list.data?.top ?? [];
	const pages = Math.ceil(rows.length / PAGE);
	const paged = rows.slice(page * PAGE, (page + 1) * PAGE);

	return (
		<>
			<TabHead title="Investors Deep Dive — 10 Years" />
			<HubFilters groups={groups} active={active} onClear={() => setAndReset({})} />

			<Tiles items={[
				{ k: 'Total Investors', v: base.data ? base.data.summary.total_investors.toLocaleString() : '—', note: 'Unique investors tracked' },
				{ k: 'Total Funding', v: base.data ? fmtFunding(base.data.summary.total_usd) : '—', note: 'Across all tracked deals' },
			]} />

			<Section title="Investment Participation by Year" note="Bars = total funding ($M) · Line = unique investors"
				right={<TimeToggle value={summaryRange} onChange={setSummaryRange} />}>
				<Body loading={base.isLoading} empty={chart.length === 0}><YearChart rows={chart} barLabel="Funding" lineLabel="Investors" /></Body>
			</Section>

			<Section title="Top Investors" note={year ? `Filtered to ${year}` : undefined} right={
				<div className="ana-sec-tools">
					<Select aria-label="Filter top investors by year" placeholder="All years" options={yearOptions} value={year}
						onChange={(e) => setAndReset({ ...filters, dealYear: e.target.value })} />
					{!year && <TimeToggle value={listRange} onChange={(v) => { setListRange(v === 'custom' ? '10y' : v); setPage(0); }} />}
				</div>
			}>
				<Body loading={list.isLoading} empty={false}>
					{rows.length === 0 ? <NoData /> : (
						<div className="atlas-table ana-table">
							<div className="atlas-table__head">
								<span className="atlas-table__rank">#</span>
								<span className="atlas-table__name">Investor</span>
								<span className="atlas-table__col ana-count">Deals</span>
								<span className="atlas-table__col ana-latest hide-sm">Latest Investment</span>
								<span className="atlas-table__col ana-date hide-sm">Date</span>
								<span className="atlas-table__amount">Amount</span>
							</div>
							{paged.map((r, i) => (
								<div className="atlas-table__row" key={r.investor}>
									<span className="atlas-table__rank">{page * PAGE + i + 1}</span>
									<span className="atlas-table__name"><span className="atlas-ellipsis ana-co-name">{r.investor}</span></span>
									<span className="atlas-table__col ana-count">{r.count.toLocaleString()}</span>
									<span className="atlas-table__col ana-latest hide-sm">
										{r.latest_company ? (r.latest_slug ? <Link href={companyHref(r.latest_slug)} className="ana-co-link">{r.latest_company}</Link> : r.latest_company) : '—'}
									</span>
									<span className="atlas-table__col ana-date hide-sm">{monthYear(r.latest_date)}</span>
									<span className="atlas-table__amount">{r.latest_usd > 0 ? fmtM(r.latest_usd) : '—'}</span>
								</div>
							))}
						</div>
					)}
					{pages > 1 && (
						<div className="ana-pager">
							<Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>Prev</Button>
							<span>{page + 1} / {pages}</span>
							<Button variant="outline" size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}>Next</Button>
						</div>
					)}
				</Body>
			</Section>
		</>
	);
}
