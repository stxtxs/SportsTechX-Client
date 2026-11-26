'use client';

import { ArrowUpLeft } from 'lucide-react';
import { Action, Empty, Loading, Screen, SectionHeader } from '@/components/atlas';
import { RaiseCard, useDealFlow } from '@/components/scout/deal-flow';
import { hrefOf } from '@/lib/routes';

/**
 * Watchlists → Saved raises: the raises saved with the bookmark in Deal Flow
 * (6.8). A list of its own until raises can go into named watchlists (Backend).
 */
export default function SavedRaisesPage() {
	const { data, isLoading } = useDealFlow('all');
	const saved = (data?.data ?? []).filter((d) => d.is_watched);
	return (
		<Screen>
			<SectionHeader />
			<div className="scout-df">
				<div className="scout-df__head scout-df__head--bar">
					<h2 className="scout-df__title">Saved raises</h2>
					<Action icon={<ArrowUpLeft />} href={hrefOf('watchlists')}>Back to Watchlists</Action>
				</div>
				{isLoading ? <Loading />
					: saved.length === 0 ? <Empty>No saved raises yet. Save a raise with the bookmark in Deal Flow and it shows up here.</Empty>
					: <div className="scout-df__grid">{saved.map((d) => <RaiseCard key={d.id} d={d} />)}</div>}
			</div>
		</Screen>
	);
}
