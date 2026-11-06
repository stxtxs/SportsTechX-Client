'use client';

import { Users } from 'lucide-react';
import { Empty, Screen, SectionHeader } from '@/components/atlas';

/**
 * Deal Flow → From the Circle is held back for launch, like Signals: the header
 * stays, the content is a "Coming soon" placeholder. The backend is untouched.
 * To bring it back, render `<DealFlow tab="circle" />` from
 * '@/components/scout/deal-flow' here, restore `showCircle` there for the All
 * tab, and restore the share page, the Raise settings opt-in and the Raise home
 * `dealflow` nudge.
 */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
				<Empty icon={<Users size={22} strokeWidth={1.5} aria-hidden="true" />} title="Coming soon">
					The Investor Circle, where members share deals with each other, is on its way.
				</Empty>
			</div>
		</Screen>
	);
}
