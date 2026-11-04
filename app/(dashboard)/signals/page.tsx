'use client';

import { Sparkles } from 'lucide-react';
import { Empty, Screen, SectionHeader } from '@/components/atlas';

/**
 * Discover → Signals is held back for launch: the header stays, the content
 * is a "Coming soon" placeholder. The backend (GET /api/signals) is untouched.
 * To bring it back, render `<Signals companiesHref={hrefOf('companies')} />`
 * from '@/components/features/signals/signals' in place of the placeholder.
 */
export default function Page() {
	return (
		<Screen>
			<SectionHeader />
			<div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
				<Empty icon={<Sparkles size={22} strokeWidth={1.5} aria-hidden="true" />} title="Coming soon">
					Signals on the companies you follow are on their way.
				</Empty>
			</div>
		</Screen>
	);
}
