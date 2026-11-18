'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import { ExportButton } from '@/components/features/exports/export-button';
import { qk } from '@/lib/query-keys';
import type { Deal } from '@/types/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useUrlSync, useUrlReader } from '@/hooks/use-url-state';
import { useRoundTypeOptions, useCountryOptions } from '@/hooks/use-catalog-options';
import { Empty, FilterBar, Flag, Loading, Logo, Pager, type FilterDef } from '@/components/atlas';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import '@/components/features/market/market.css';
import { fmtUsd, place } from '@/components/features/market/format';
import './funding.css';
import { fmtMonth } from '@/lib/format';
import { yearOf } from '@/lib/format';

/**
 * Recently Funded — disclosed funding rounds, newest first (GET /api/deals).
 * Toolbar: search · round · country · period; table: company, date, round,
 * investors, amount. Shared feature — products pass where company links go.
 */


const PAGE_SIZE = 25;
const PERIODS: [string, string][] = [['30', 'Last 30 days'], ['90', 'Last 90 days'], ['365', 'Last 12 months']];
const SORTS: [string, string][] = [['-announced_date', 'Newest'], ['-amount_usd', 'Largest']];
const isoDaysAgo = (days: number) => new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
const fmtDate = (d?: string | null) => fmtMonth(d);

export function RecentlyFunded({ companyHref }: { companyHref: (idOrSlug: string) => string }) {
	// View-state in the URL (Back/Forward restore, shareable).
	const url = useUrlReader();
	const [q, setQ] = useState(() => url.str('q'));
	const dq = useDebouncedValue(q);
	const [round, setRound] = useState(() => url.str('round'));
	const [country, setCountry] = useState(() => url.str('country'));
	const [period, setPeriod] = useState(() => url.oneOf('period', PERIODS.map(([v]) => v), ''));
	const [sort, setSort] = useState(() => url.oneOf('sort', SORTS.map(([v]) => v), '-announced_date'));
	const [page, setPage] = useState(() => url.num('page', 1));
	const reset = () => setPage(1);
	useUrlSync({
		q: dq, round, country, period,
		sort: sort !== '-announced_date' ? sort : undefined,
		page: page > 1 ? page : undefined,
	});
	const roundOptions = useRoundTypeOptions();
	const countryOptions = useCountryOptions();
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (round) p.round_type_slug = round;
		if (country) p.country = country;
		if (period) p.from = isoDaysAgo(Number(period));
		return p;
	}, [page, sort, dq, round, country, period]);
	const res = useSWR<{ data: Deal[]; total: number; totalPages: number }>(qk.deals.list(params), { keepPreviousData: true });
	const rows = res.data?.data ?? [];
	const total = res.data?.total ?? 0;
	const anyFilter = !!(dq || round || country || period);

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search companies or investors' }}
				groups={[
					{ label: 'Round', filters: [sel('round', 'Round', round, roundOptions, setRound)] },
					{ label: 'Geography', filters: [sel('country', 'Country', country, countryOptions, setCountry)] },
					{ label: 'Date', filters: [sel('period', 'Period', period, PERIODS, setPeriod)] },
				]}
				sort={{ value: sort, options: SORTS, onChange: (v) => { setSort(v); reset(); } }}
				canClear={anyFilter}
				onClear={() => { setQ(''); setRound(''); setCountry(''); setPeriod(''); reset(); }}
			/>

			{/* The master table (handover v1 A6): the Companies list's card, count
			    and Export in the top row, label headings, logo + name, flag + city,
			    right-aligned amounts and a bookmark. Deal tables show the month only. */}
			{res.isLoading && rows.length === 0 ? <Loading /> : rows.length === 0 ? <Empty>No results for these filters. Remove one, or clear them all.</Empty> : (
				<div className="atlas-card atlas-chart-card" style={{ marginTop: 10 }}>
					<div className="atlas-dt__top">
						<span>{total.toLocaleString()} funding round{total === 1 ? '' : 's'} · {PERIODS.find(([k]) => k === period)?.[1] ?? 'All time'}</span>
						<ExportButton entity="deals" search={dq} params={params} />
					</div>
					<div className="atlas-table mkt-table" role="table" aria-label="Funding rounds">
						<div className="atlas-table__head" role="row">
							<span className="atlas-table__name" role="columnheader">Company</span>
							<span className="atlas-table__col hide-sm" style={{ width: 150 }} role="columnheader">Location</span>
							<span className="atlas-table__col" style={{ width: 84 }} role="columnheader">Date</span>
							<span className="atlas-table__col hide-sm" style={{ width: 110 }} role="columnheader">Round</span>
							<span className="atlas-table__col hide-md atlas-dt__flex" role="columnheader">Investors</span>
							<span className="atlas-table__col" style={{ width: 96, textAlign: 'right' }} role="columnheader">Amount</span>
							<span className="atlas-table__col" style={{ width: 32 }} role="columnheader"><span className="sr-only">Save</span></span>
						</div>
						{rows.map((d) => {
							const investors = d.investors?.length ? d.investors : d.lead_investor ? [d.lead_investor] : [];
							const amount = d.amount_usd != null && Number(d.amount_usd) > 0 ? fmtUsd(Number(d.amount_usd), yearOf(d.announced_date)) : null;
							return (
								<div key={d.id} className="atlas-table__row mkt-row" role="row">
									<div className="atlas-table__name" role="cell">
										<Logo co={{ name: d.company_name, website: d.company_website ?? null, custom_logo_url: d.company_custom_logo_url }} size={30} radius={6} />
										<div className="atlas-table__name-main">
											<Link href={companyHref(d.company_slug ?? d.company_id)} className="atlas-ellipsis mkt-row-link" style={{ fontWeight: 600, minWidth: 0 }}>{d.company_name}</Link>
										</div>
									</div>
									<span className="atlas-table__col hide-sm mkt-icontext" style={{ width: 150 }} role="cell" title={place(d.hq_city, d.hq_country) || undefined}>
										{d.hq_country || d.hq_city
											? <><span className="mkt-flag"><Flag cc={d.hq_country ?? ''} size={13} /></span><span className="atlas-ellipsis">{d.hq_city || d.hq_country}</span></>
											: '—'}
									</span>
									<span className="atlas-table__col" style={{ width: 84 }} role="cell">{fmtDate(d.announced_date)}</span>
									<span className="atlas-table__col hide-sm atlas-dt__clip" style={{ width: 110 }} role="cell" title={d.round_type_name ?? undefined}>{d.round_type_name ?? '—'}</span>
									<span className="atlas-table__col hide-md atlas-dt__flex" role="cell" title={investors.join(', ') || undefined}>{investors.join(', ') || 'Undisclosed'}</span>
									<span className="atlas-table__col" style={{ width: 96, textAlign: 'right', fontWeight: amount ? 600 : 400, color: amount ? 'var(--a-ink)' : undefined }} role="cell">{amount ?? 'Undisclosed'}</span>
									<span className="atlas-table__col mkt-save" style={{ width: 32 }} role="cell">
										{d.company_id && <SaveToWatchlist companyId={d.company_id} companyName={d.company_name ?? ''} compact />}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}
			<Pager page={page} totalPages={res.data?.totalPages ?? 1} onPage={setPage} />
		</>
	);
}
