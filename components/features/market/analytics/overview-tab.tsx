'use client';

import useSWR from 'swr';
import { Loading } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { Tiles, NoData, Section, Body, YearChart, ModelBars, CompanyTable, fmtM, fmtB, type HubDeepDive } from './kit';

interface Overview {
	year: number;
	funding_10y: number; rounds_10y: number; ma_10y: number; acquisitions_10y: number;
	funding_ytd: number; rounds_ytd: number; ma_ytd: number; acquisitions_ytd: number;
	countries: number; cities: number;
}

/**
 * Hub Overview: the two tile rows (rolling 10 years, this year), then the
 * market at a glance — funding and M&A by year, where the money goes (business
 * model, countries) and who raised most. Everything below the tiles reuses the
 * Funding / M&A tabs' 10-year requests (same SWR keys), so it costs no extra
 * fetches when the reader moves between tabs.
 */
export function OverviewTab() {
	const { data, isLoading } = useSWR<Overview>(qk.analytics.hub.overview());
	const funding = useSWR<HubDeepDive>(qk.analytics.hub.funding({ window: '10y' }));
	const ma = useSWR<HubDeepDive>(qk.analytics.hub.ma({ window: '10y', perspective: 'acquiree' }));
	if (isLoading) return <Loading />;
	if (!data) return <NoData />;
	const n = (v: number) => v.toLocaleString();
	const y = data.year;
	const fYears = (funding.data?.yearly ?? []).map((r) => ({ year: r.year, amt: r.total_usd, deals: r.count }));
	const mYears = (ma.data?.yearly ?? []).map((r) => ({ year: r.year, amt: r.total_usd, deals: r.count }));
	const countries = (funding.data?.countries ?? []).slice(0, 6).map((c) => ({ key: c.country, count: c.count, total_usd: c.total_usd }));
	return (
		<>
			<div className="ana-row-title">10-Year Market Overview</div>
			<Tiles items={[
				{ k: 'Total Funding', v: fmtB(data.funding_10y), note: '10-year investment' },
				{ k: 'Funding Rounds', v: n(data.rounds_10y), note: 'Total rounds' },
				{ k: 'M&A Value', v: fmtB(data.ma_10y), note: 'Acquisition value' },
				{ k: 'Acquisitions', v: n(data.acquisitions_10y), note: 'Total deals' },
				{ k: 'Global Reach', v: n(data.countries), note: 'Countries funded' },
			]} />
			<div className="ana-row-title">{y} Market Overview (YTD)</div>
			<Tiles pink items={[
				{ k: `${y} Funding`, v: fmtM(data.funding_ytd), note: 'Year to date' },
				{ k: `${y} Rounds`, v: n(data.rounds_ytd), note: 'This year' },
				{ k: `${y} M&A`, v: fmtM(data.ma_ytd), note: 'Acquisition value' },
				{ k: `${y} Deals`, v: n(data.acquisitions_ytd), note: 'M&A deals' },
				{ k: 'City Coverage', v: n(data.cities), note: 'Cities reached' },
			]} />

			<div className="ana-two">
				<Section title="Funding by Year" note="Bars = total funding · Line = funding rounds">
					<Body loading={funding.isLoading} empty={fYears.length === 0}><YearChart rows={fYears} barLabel="Funding ($B)" lineLabel="Rounds" /></Body>
				</Section>
				<Section title="M&A by Year" note="Bars = acquisition value · Line = deals">
					<Body loading={ma.isLoading} empty={mYears.length === 0}><YearChart rows={mYears} barLabel="Acquisitions ($B)" lineLabel="Deals" /></Body>
				</Section>
			</div>

			<div className="ana-two">
				<Section title="Funding by Business Model" note="Last 10 years">
					<Body loading={funding.isLoading} empty={!funding.data?.models.length}><ModelBars rows={funding.data?.models ?? []} /></Body>
				</Section>
				<Section title="Top Funded Countries" note="Last 10 years">
					<Body loading={funding.isLoading} empty={countries.length === 0}><ModelBars rows={countries} /></Body>
				</Section>
			</div>

			<Section title="Top Funded Companies" note="Last 10 years · see the Funding tab for the full list">
				<Body loading={funding.isLoading} empty={!funding.data?.top.length}><CompanyTable rows={(funding.data?.top ?? []).slice(0, 5)} countLabel="Rounds" pillarIcons /></Body>
			</Section>
		</>
	);
}
