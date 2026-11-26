'use client';

import { Lock } from 'lucide-react';
import useSWR from 'swr';
import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';
import { useUserProfile } from '@/hooks/use-user-profile';
import { qk } from '@/lib/query-keys';

/** Where "About Boardroom" goes: the Boardroom section of the SportsTechX site (as in the footer). */
const ABOUT_BOARDROOM = 'https://www.sportstechx.com/#boardroom';

/**
 * Deal Flow → From Boardroom (Deal Flow for launch, 7.1). Shown to everyone,
 * locked for non-members. A Boardroom member holds the `boardroom` grant an
 * admin gives on the user page; the server only sends these raises to members.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	// Shares its key (and request) with the feature-access context.
	const { data: grants } = useSWR<{ data: Array<{ feature_slug: string }> }>(qk.me.featureGrants());
	const member = profile?.user_role === 'admin' || !!grants?.data?.some((g) => g.feature_slug === 'boardroom');
	return (
		<Screen>
			<SectionHeader />
			{member ? <DealFlow tab="circle" /> : (
				<div className="scout-locked">
					<span className="scout-locked__icon" aria-hidden="true"><Lock size={18} /></span>
					<p className="scout-locked__text">Available to Boardroom members.</p>
					<a className="atlas-btn atlas-btn--outline" href={ABOUT_BOARDROOM} target="_blank" rel="noopener noreferrer">About Boardroom</a>
				</div>
			)}
		</Screen>
	);
}
