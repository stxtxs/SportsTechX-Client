'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { Empty, Screen, SectionHeader } from '@/components/atlas';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';

/**
 * Discover → Signals is held back for launch: the header stays, the content
 * is a "Coming soon" placeholder. The backend (GET /api/signals) is untouched.
 * To bring it back, render `<Signals companiesHref={hrefOf('companies')} />`
 * from '@/components/features/signals/signals' in place of the placeholder.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	return (
		<Screen>
			<SectionHeader />
			{/* Scout's thesis drives Signals, as it does Recommended: same link, same place. */}
			{getUserType(profile) === 'scout' && (
				<div className="scout-subhead">
					<div>
						<h2 className="atlas-h2">Signals</h2>
						<p className="scout-muted">What the companies you track are doing.</p>
					</div>
					<Link href={hrefOf('interests')} className="scout-link">Edit preferences</Link>
				</div>
			)}
			<div style={{ minHeight: '50vh', display: 'grid', placeItems: 'center' }}>
				<Empty icon={<Sparkles size={22} strokeWidth={1.5} aria-hidden="true" />} title="Coming soon">
					Signals on the companies you follow are on their way.
				</Empty>
			</div>
		</Screen>
	);
}
