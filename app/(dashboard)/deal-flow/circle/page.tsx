'use client';

import { Lock } from 'lucide-react';
import { Screen, SectionHeader } from '@/components/atlas';
import { DealFlow } from '@/components/scout/deal-flow';
import { useUserProfile } from '@/hooks/use-user-profile';

/** Where "About Boardroom" goes: the Boardroom section of the SportsTechX site (as in the footer). */
const ABOUT_BOARDROOM = 'https://www.sportstechx.com/#boardroom';

/**
 * Deal Flow → From Boardroom (Deal Flow for launch, 7.1). Shown to everyone,
 * locked for non-members. There is no Boardroom-member flag on the account
 * yet (Backend), so until there is, only admins see the raises.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	const member = profile?.user_role === 'admin';
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
