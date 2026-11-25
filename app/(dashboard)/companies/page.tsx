'use client';

import { Screen, SectionHeader } from '@/components/atlas';
import { MarketCompanies } from '@/components/features/market/market-companies';
import { Recommended } from '@/components/scout/recommended';
import { ListModeSwitch, ModeBar, useListMode } from '@/components/features/recommended/recommended-window';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { companyHref } from '@/lib/routes';
import { useDeepLinkKey } from '@/hooks/use-url-state';

/**
 * Companies: the sports tech company database (live). On Scout it carries the
 * "Recommended / All" switch (handover v1 A7).
 */
export default function Page() {
	// Remount on a genuine deep link (?q= / ?sector=) so the filters pick it up —
	// but not when the list synced its own search/filters into the URL, which
	// remounted the search box on every keystroke and dropped its focus.
	const key = useDeepLinkKey(['company', 'list']); // neither the drawer nor the switch changes the list
	const { data: profile } = useUserProfile();
	const isScout = getUserType(profile) === 'scout';
	// Scout opens on Recommended (Deal Flow 6.6); the switch sits in the filter bar (preview fixes 4).
	const [mode, setMode] = useListMode(isScout ? 'recommended' : 'all');
	const modeSwitch = isScout ? <ListModeSwitch value={mode} onChange={setMode} /> : undefined;
	return (
		<Screen>
			<SectionHeader />
			{isScout && mode === 'recommended'
				? <><ModeBar>{modeSwitch}</ModeBar><Recommended /></>
				: <MarketCompanies key={key} companyHref={companyHref} modeSwitch={modeSwitch} />}
		</Screen>
	);
}
