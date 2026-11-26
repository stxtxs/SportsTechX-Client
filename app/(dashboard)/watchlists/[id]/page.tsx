'use client';

import { useParams } from 'next/navigation';
import { Empty, Loading, Screen, SectionHeader } from '@/components/atlas';
import { WatchlistDetail } from '@/components/features/watchlists/watchlist-detail';
import { WatchlistBar } from '@/components/features/watchlists/watchlist-bar';
import { WatchlistBoard } from '@/components/scout/watchlist-board';
import { InvestorBoard } from '@/components/raise/investor-board';
import { toast } from 'sonner';
import { isInvestorList, setWatchlistView, useCompanyWatchlists } from '@/components/features/watchlists/use-company-watchlists';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { companyHref, hrefOf } from '@/lib/routes';

type View = 'list' | 'board';

/**
 * Watchlists → one watchlist. A Raise investor list opens as the investor
 * board filtered to it; a company list as below.
 *
 * Scout also gets a stage board; the other tiers only have the list, so the
 * switcher is theirs alone. Previously two near-identical pages.
 */
export default function Page() {
	const id = String(useParams().id);
	const { data: profile } = useUserProfile();
	const isScout = getUserType(profile) === 'scout';
	// Saved per watchlist on the server (`user_watchlists.view_mode`); the list
	// request is shared with the sidebar, so this costs nothing extra.
	const { lists, isLoading } = useCompanyWatchlists();
	const list = lists.find((l) => l.id === id);
	const view: View = list?.view_mode ?? 'list';
	const setView = (v: View) => void setWatchlistView(id, v).then((ok) => { if (!ok) toast.error("Couldn't save the view. Please try again."); });
	const board = isScout && view === 'board';
	// Wait for the kind, or a company view would flash before the investor board.
	if (isLoading) return <Screen><Loading /></Screen>;
	if (list && isInvestorList(list)) {
		// The board reads the Raise-only pipeline; anywhere else it would just 403.
		return getUserType(profile) === 'raise'
			? <InvestorBoard listId={id} />
			: <Screen><Empty>Investor watchlists are part of Atlas Raise.</Empty></Screen>;
	}
	return (
		<Screen>
			{/* The header and tabs stay as on every Deal Flow tab; this list's own
			    row sits under them (preview fixes, remaining 1-2). */}
			<SectionHeader />
			{list && <WatchlistBar list={list} view={isScout ? view : undefined} onView={isScout ? setView : undefined} />}
			{board
				? <WatchlistBoard id={id} />
				: <WatchlistDetail id={id} backHref={hrefOf('watchlists')} companyHref={companyHref} />}
		</Screen>
	);
}
