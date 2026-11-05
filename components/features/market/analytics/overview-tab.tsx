'use client';

import useSWR from 'swr';
import { Loading } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { Tiles, NoData } from './kit';

interface Overview {
	year: number;
	funding_10y: number; rounds_10y: number; ma_10y: number; acquisitions_10y: number;
	funding_ytd: number; rounds_ytd: number; ma_ytd: number; acquisitions_ytd: number;
	countries: number; cities: number;
}

/** Hub Overview: a rolling 10-year row and a this-year row, five tiles each. */
export function OverviewTab() {
	const { data, isLoading } = useSWR<Overview>(qk.analytics.hub.overview());
	if (isLoading) return <Loading />;
	if (!data) return <NoData />;
	const b = (usd: number) => `$${(usd / 1e9).toFixed(1)}B`;
	const m = (usd: number) => `$${(usd / 1e6).toFixed(0)}M`;
	const y = data.year;
	return (
		<>
			<div className="ana-row-title">10-Year Market Overview</div>
			<Tiles items={[
				{ k: 'Total Funding', v: b(data.funding_10y), note: '10-year investment' },
				{ k: 'Funding Rounds', v: String(data.rounds_10y), note: 'Total rounds' },
				{ k: 'M&A Value', v: b(data.ma_10y), note: 'Acquisition value' },
				{ k: 'Acquisitions', v: String(data.acquisitions_10y), note: 'Total deals' },
				{ k: 'Global Reach', v: String(data.countries), note: 'Countries funded' },
			]} />
			<div className="ana-row-title">{y} Market Overview (YTD)</div>
			<Tiles pink items={[
				{ k: `${y} Funding`, v: m(data.funding_ytd), note: 'Year to date' },
				{ k: `${y} Rounds`, v: String(data.rounds_ytd), note: 'This year' },
				{ k: `${y} M&A`, v: m(data.ma_ytd), note: 'Acquisition value' },
				{ k: `${y} Deals`, v: String(data.acquisitions_ytd), note: 'M&A deals' },
				{ k: 'City Coverage', v: String(data.cities), note: 'Cities reached' },
			]} />
		</>
	);
}
