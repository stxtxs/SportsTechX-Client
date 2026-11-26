'use client';

import Link from 'next/link';
import { toast } from 'sonner';
import { useMemo, useState } from 'react';
import { Empty, FilterBar, Loading } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import { useCompanyWatchlists, useWatchlistCompanies, removeFromWatchlist, useSavedCompanyIds, useWatchlistRaiseIds } from './use-company-watchlists';
import { LIMIT as DEALFLOW_LIMIT, RaiseCard } from '@/components/scout/deal-flow';
import type { DealRow } from '@/components/scout/deal-types';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { CompanyListItem as Company } from '@/types/api';
import { CompanyTable } from '@/components/features/market/market-companies';
import { getUserType, useCanSeeFundraising, useUserProfile } from '@/hooks/use-user-profile';
import { COMPANY_STAGES, companyStage, moveCompanyStage } from '@/components/scout/watchlist-stages';
import { stageRank } from './stage-pill';
import '@/components/features/market/market.css';
import './watchlists.css';

/**
 * The live raises saved in a list (6.8), as Deal Flow cards, fetched by id so a list never misses
 * one beyond the first page. Deal Flow is Scout's: other plans (a lapsed Scout) don't fetch it.
 * A raise the user can no longer see (closed, test, Boardroom without access) simply drops out.
 */
export function useWatchlistRaises(id: string): DealRow[] {
	const { data: profile } = useUserProfile();
	const { ids } = useWatchlistRaiseIds(id);
	const scout = getUserType(profile) === 'scout';
	const { data } = useSWR<{ data: DealRow[] }>(scout && ids.length ? qk.scout.dealflow({ tab: 'all', limit: DEALFLOW_LIMIT, ids: ids.slice(0, DEALFLOW_LIMIT).join(',') }) : null);
	return data?.data ?? [];
}

export function WatchlistRaises({ id }: { id: string }) {
	const rows = useWatchlistRaises(id);
	if (rows.length === 0) return null;
	return (
		<section style={{ marginBottom: 28 }} aria-label="Raises in this watchlist">
			<h2 className="scout-df__title" style={{ fontSize: 16, margin: '0 0 12px' }}>Raises</h2>
			<div className="scout-df__grid">{rows.map((d) => <RaiseCard key={d.id} d={d} />)}</div>
		</section>
	);
}

/** One company watchlist as the master companies table, with remove. The row above it is WatchlistBar. */
export function WatchlistDetail({ id, backHref, companyHref }: { id: string; backHref: string; companyHref: (idOrSlug: string) => string }) {
	const { lists, isLoading: listsLoading } = useCompanyWatchlists();
	const { companies, isLoading } = useWatchlistCompanies(id);
	const list = lists.find((l) => l.id === id);
	// The list's companies as full company rows, so the table shows the same
	// columns (verified tick, sector icon) as Companies.
	const ids = companies.map((c) => c.id);
	const fullQ = useSWR<{ data: Company[] }>(ids.length ? qk.companies.list({ ids: ids.join(','), limit: 100, page: 1, sort: 'name' }) : null, { keepPreviousData: true });
	const full = useMemo(() => fullQ.data?.data ?? [], [fullQ.data]);
	const savedIds = useSavedCompanyIds();
	const canSeeRaising = useCanSeeFundraising();
	// Scout lists have stages (2.13): a Stage column, sort by it, filter by it.
	const { data: profile } = useUserProfile();
	const hasStages = getUserType(profile) === 'scout';
	const [stageFilter, setStageFilter] = useState('');
	const raiseRows = useWatchlistRaises(id);
	const raisesSection = <WatchlistRaises id={id} />;
	const [sort, setSort] = useState<'name' | 'stage'>('name');
	const stageById = useMemo(() => new Map(companies.map((c) => [c.id, companyStage(c.stage)])), [companies]);
	const shown = useMemo(() => {
		const rows = hasStages && stageFilter ? full.filter((c) => stageById.get(c.id) === stageFilter) : full;
		return sort === 'stage' && hasStages
			? [...rows].sort((a, b) => stageRank(COMPANY_STAGES, stageById.get(a.id)) - stageRank(COMPANY_STAGES, stageById.get(b.id)) || a.name.localeCompare(b.name))
			: rows;
	}, [full, hasStages, stageFilter, sort, stageById]);

	if (listsLoading) return <Loading />;
	if (!list) return <Empty>Watchlist not found. <Link href={backHref}>Watchlists</Link></Empty>;

	const remove = async (companyId: string, name: string) => {
		try { await removeFromWatchlist(id, companyId); toast.success(`Removed ${name}`); } catch (e) { toast.error((e as Error).message); }
	};

	if (isLoading) return <Loading />;
	if (companies.length === 0) {
		if (raiseRows.length > 0) return <>{raisesSection}</>;
		return <Empty>No companies yet. <Link href={hrefOf('companies')} style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>Browse companies</Link> and use &quot;Add to watchlist&quot;.</Empty>;
	}
	// The master companies table, as on Companies (preview fixes 2.5).
	const table = (
		<CompanyTable
			rows={shown}
			hrefFor={(c) => companyHref(c.slug ?? c.id)}
			savedIds={savedIds}
			canSeeRaising={canSeeRaising}
			onRemove={(c) => void remove(c.id, c.name)}
			stage={hasStages ? {
				valueOf: (c) => stageById.get(c.id) ?? 'identified',
				options: COMPANY_STAGES,
				onChange: (c, key) => void moveCompanyStage(id, c.id, key),
				sort: { active: sort === 'stage', onToggle: () => setSort(sort === 'stage' ? 'name' : 'stage') },
			} : undefined}
		/>
	);
	if (!hasStages) return <>{raisesSection}{table}</>;
	return (
		<>
			{raisesSection}
			<FilterBar
				groups={[{ label: 'Watchlist', filters: [{
					kind: 'select', key: 'stage', label: 'Stage', value: stageFilter, onChange: setStageFilter,
					options: [['', 'All stages'], ...COMPANY_STAGES.map((o) => [o.key, o.label] as [string, string])],
				}] }]}
				sort={{ value: sort, onChange: (v) => setSort(v as 'name' | 'stage'), options: [['name', 'Name'], ['stage', 'Stage']] }}
				canClear={!!stageFilter}
				onClear={() => setStageFilter('')}
			/>
			{shown.length === 0 && full.length > 0
				? <Empty>No companies at this stage. Pick another stage, or clear the filter.</Empty>
				: table}
		</>
	);
}
