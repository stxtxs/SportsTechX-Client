'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { AllInvestors, RecommendedInvestors } from '@/components/raise/investors';
import { ListModeSwitch, ModeBar, useListMode } from '@/components/features/recommended/recommended-window';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

/**
 * Investors: the investor database. On Raise it carries the "Recommended / All"
 * switch (handover v1 A7); recommendations are a filtered view of this list,
 * not a page of their own.
 */
export default function InvestorsPage() {
	const { data: profile } = useUserProfile();
	const isRaise = getUserType(profile) === 'raise';
	const [mode, setMode] = useListMode();
	const recommended = isRaise && mode === 'recommended';
	return (
		<Screen>
			{/* The switch sits in the filter bar, as on Companies and the raise tabs (preview fixes 4). */}
			<SectionHeader />
			{recommended
				? <><ModeBar><ListModeSwitch value={mode} onChange={setMode} /></ModeBar><RecommendedInvestors /></>
				: <AllInvestors modeSwitch={isRaise ? <ListModeSwitch value={mode} onChange={setMode} /> : undefined} />}
		</Screen>
	);
}
