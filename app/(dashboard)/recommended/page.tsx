'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loading, Screen } from '@/components/atlas';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';

/**
 * Recommended is no longer a page (handover v1 §2): it is the "Recommended"
 * side of the switch on Investors (Raise) and Companies (Scout). Old links and
 * chat chips land here and are sent on.
 */
export default function Page() {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	useEffect(() => {
		if (!profile) return;
		const list = getUserType(profile) === 'scout' ? hrefOf('companies') : hrefOf('investors');
		router.replace(`${list}?list=recommended`);
	}, [profile, router]);
	return <Screen><Loading /></Screen>;
}
