'use client';

import { Tabs } from '@/components/atlas';
import { useUrlReader, useUrlSync } from '@/hooks/use-url-state';
import { useState } from 'react';
import { OverviewTab } from './analytics/overview-tab';
import { FundingTab } from './analytics/funding-tab';
import { MaTab } from './analytics/ma-tab';
import { InvestorsTab } from './analytics/investors-tab';
import './analytics/analytics.css';

const TABS = ['overview', 'funding', 'ma', 'investors'] as const;
type Tab = (typeof TABS)[number];

/**
 * Analytics — the old Intelligence Hub analytics page, rebuilt on Atlas:
 * Overview · Funding · M&A · Investors, in the hub's order, with its sections,
 * controls and calculations (server: /api/analytics/hub/*). The hub's Monthly
 * Roundup tab is its own page here (/roundup).
 *
 * The active tab lives in `?tab=` (the hub used /analytics/:tab), so a link or
 * Back lands on the same tab.
 */
export function MarketAnalysis() {
	const url = useUrlReader();
	const [tab, setTab] = useState<Tab>(() => url.oneOf('tab', TABS, 'overview'));
	useUrlSync({ tab: tab === 'overview' ? undefined : tab });

	return (
		// minmax(0, 1fr): an implicit `auto` track grows to its widest child's
		// min-content, which pushed the whole page wider than a phone.
		<div className="ana">
			<Tabs<Tab> value={tab} onChange={setTab} tabs={[
				{ key: 'overview', label: 'Overview' },
				{ key: 'funding', label: 'Funding' },
				{ key: 'ma', label: 'M&A' },
				{ key: 'investors', label: 'Investors' },
			]} />
			{tab === 'overview' && <OverviewTab />}
			{tab === 'funding' && <FundingTab />}
			{tab === 'ma' && <MaTab />}
			{tab === 'investors' && <InvestorsTab />}
			<div className="ana-foot">Figures cover disclosed deals only. Source: SportsTechX research.</div>
		</div>
	);
}
