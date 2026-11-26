'use client';

import { useMemo, useState } from 'react';
import { Empty, FilterBar, Logo } from '@/components/atlas';
import { StagePill, stageRank, type StageOption } from '@/components/features/watchlists/stage-pill';
import { fmtAmount } from '@/lib/format';
import type { PipelineStage } from '@/types/api';
import '@/components/features/market/market.css';
import '@/components/features/watchlists/watchlists.css';

/** Raise's investor stages, Target to Closed (then Passed), as pills (2.13). */
export const INVESTOR_STAGES: StageOption[] = [
	{ key: 'target', label: 'Target', tone: 'neutral' },
	{ key: 'contacted', label: 'Contacted', tone: 'navy' },
	{ key: 'in_conversation', label: 'In conversation', tone: 'navy' },
	{ key: 'due_diligence', label: 'Due diligence', tone: 'warn' },
	{ key: 'term_sheet', label: 'Term sheet', tone: 'warn' },
	{ key: 'committed', label: 'Committed', tone: 'ok' },
	{ key: 'closed', label: 'Closed', tone: 'ok' },
	{ key: 'passed', label: 'Passed', tone: 'danger' },
];

export interface InvestorListRow {
	id: string; name: string; stage: PipelineStage;
	website: string | null; logo: string | null;
	contact: string | null; potential: string | null; next: string | null;
}

/**
 * An investor watchlist as a table: Investor, Stage (a pill that changes the
 * stage, saved the same as dragging a card on the board), Contact, Potential
 * and Next step. Sort and filter by stage (2.13).
 */
export function InvestorList({ rows, onStage, onOpen }: {
	rows: InvestorListRow[];
	onStage: (id: string, stage: PipelineStage) => void;
	onOpen: (id: string) => void;
}) {
	const [stageFilter, setStageFilter] = useState('');
	const [sort, setSort] = useState<'name' | 'stage'>('stage');
	const shown = useMemo(() => {
		const list = stageFilter ? rows.filter((r) => r.stage === stageFilter) : rows;
		const byStage = (a: InvestorListRow, b: InvestorListRow) => (sort === 'stage' ? stageRank(INVESTOR_STAGES, a.stage) - stageRank(INVESTOR_STAGES, b.stage) : 0);
		return [...list].sort((a, b) => byStage(a, b) || a.name.localeCompare(b.name));
	}, [rows, stageFilter, sort]);

	return (
		<>
			<FilterBar
				groups={[{ label: 'Watchlist', filters: [{
					kind: 'select', key: 'stage', label: 'Stage', value: stageFilter, onChange: setStageFilter,
					options: [['', 'All stages'], ...INVESTOR_STAGES.map((o) => [o.key, o.label] as [string, string])],
				}] }]}
				sort={{ value: sort, onChange: (v) => setSort(v as 'name' | 'stage'), options: [['stage', 'Stage'], ['name', 'Name']] }}
				canClear={!!stageFilter}
				onClear={() => setStageFilter('')}
			/>
			{shown.length === 0 ? <Empty>No investors at this stage. Pick another stage, or clear the filter.</Empty> : (
				<div className="atlas-table mkt-table" role="table">
					<div className="atlas-table__head">
						<span className="atlas-table__name">Investor</span>
						<span className="atlas-table__col" style={{ width: 160 }}>
							<button type="button" className="mkt-sort" aria-pressed={sort === 'stage'} onClick={() => setSort(sort === 'stage' ? 'name' : 'stage')}>Stage{sort === 'stage' ? ' ↓' : ''}</button>
						</span>
						<span className="atlas-table__col hide-sm" style={{ width: 170 }}>Contact</span>
						<span className="atlas-table__col" style={{ width: 110, textAlign: 'right' }}>Potential</span>
						<span className="atlas-table__col hide-sm" style={{ width: 220 }}>Next step</span>
					</div>
					{shown.map((r) => (
						<div key={r.id} className="atlas-table__row mkt-row" style={{ cursor: 'pointer' }} onClick={() => onOpen(r.id)}>
							<div className="atlas-table__name">
								<Logo co={{ name: r.name, website: r.website, custom_logo_url: r.logo }} size={30} radius={6} />
								<span className="atlas-ellipsis" style={{ fontWeight: 600, minWidth: 0 }}>{r.name}</span>
							</div>
							{/* The pill's own click must not open the row's detail panel. */}
							<span className="atlas-table__col" style={{ width: 160 }} onClick={(e) => e.stopPropagation()}>
								<StagePill value={r.stage} options={INVESTOR_STAGES} onChange={(k) => onStage(r.id, k as PipelineStage)} ariaLabel={`Stage for ${r.name}`} />
							</span>
							<span className="atlas-table__col hide-sm atlas-ellipsis" style={{ width: 170 }}>{r.contact ?? '—'}</span>
							<span className="atlas-table__col" style={{ width: 110, textAlign: 'right' }}>{r.potential ? fmtAmount(r.potential, 'EUR') : '—'}</span>
							<span className="atlas-table__col hide-sm atlas-ellipsis" style={{ width: 220 }}>{r.next ?? '—'}</span>
						</div>
					))}
				</div>
			)}
		</>
	);
}
