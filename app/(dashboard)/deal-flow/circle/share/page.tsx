'use client';

import { Users } from 'lucide-react';
import { Empty, Screen } from '@/components/atlas';

/**
 * From the Circle → Share a deal, held back with the rest of the Investor
 * Circle (see ../page.tsx). To bring it back, render
 * `<ShareDeal resumeId={useSearchParams().get('draft') ?? undefined} />` from
 * '@/components/scout/share-deal' (`?draft=<id>` reopens a submission).
 */
export default function ScoutShareDealPage() {
	return (
		<Screen>
			<div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
				<Empty icon={<Users size={22} strokeWidth={1.5} aria-hidden="true" />} title="Coming soon">
					Sharing deals with the Investor Circle is on its way.
				</Empty>
			</div>
		</Screen>
	);
}
