'use client';

import { Layers } from 'lucide-react';
import { Empty, Screen, SectionHeader } from '@/components/atlas';

/**
 * Deal Flow is held back for launch, like Signals: every Deal Flow page (All,
 * Featured, Verified Raises, From the Circle, Share a deal, a single deal)
 * renders this instead. The backend is untouched.
 *
 * To bring it back, restore each page under app/(dashboard)/deal-flow from git
 * (they rendered <DealFlow tab=… />, <ShareDeal />, <DealDetail />), plus:
 * the Scout home Deal Flow card, `deals` in the command palette's Scout search,
 * `showCircle` on the All tab, the Raise settings opt-in (<DealflowOptIn />)
 * and the Raise home `dealflow` nudge.
 */
export function DealFlowSoon({ header = true }: { header?: boolean }) {
	return (
		<Screen>
			{header && <SectionHeader />}
			<div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
				<Empty icon={<Layers size={22} strokeWidth={1.5} aria-hidden="true" />} title="Coming soon">
					Deal Flow — featured deals, verified raises and the Investor Circle — is on its way.
				</Empty>
			</div>
		</Screen>
	);
}
