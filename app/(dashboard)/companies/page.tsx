'use client';

import { Button, Screen, SectionHeader } from '@/components/atlas';
import { MarketCompanies } from '@/components/features/market/market-companies';
import { ListModeSwitch, useListMode } from '@/components/features/recommended/recommended-window';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { companyHref, hrefOf } from '@/lib/routes';
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
	const recommended = isScout && mode === 'recommended';
	return (
		<Screen>
			{/* "Edit preferences" in the page header on Recommended (preview fixes 1.5). */}
			<SectionHeader actions={recommended ? <Button size="sm" variant="outline" href={hrefOf('interests')}>Edit preferences</Button> : undefined} />
			{/* One list, one table; Recommended is a filtered view of it (preview fixes 1.1). */}
			<MarketCompanies key={`${key}:${mode}`} companyHref={companyHref} modeSwitch={modeSwitch} recommended={recommended} />
		</Screen>
	);
}
