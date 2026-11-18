'use client';

import { Empty, Screen, SectionHeader } from '@/components/atlas';
import { forTier, ROUTE_BY_ID } from '@/lib/routes';
import { DeckSummary } from '@/components/features/deck-analysis/deck-summary';
import { SCREENER_COPY } from '@/components/scout/deck-screener';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

/** Mirrors the route manifest's `soon` flag, so un-flagging the route turns the page on. */
const DECK_SCREENER_SOON = !!forTier(ROUTE_BY_ID.get('deck')?.soon, 'scout');

/**
 * Deck analysis — upload a deck, get a structured read.
 *
 * One screen, two audiences: a founder checking their own pitch ("Pitch Deck")
 * and an investor screening someone else's ("Deck Screener"). Same backend,
 * same component; only the copy differs, which is why this was two pages.
 *
 * `DeckSummary` renders its own `Screen` — don't wrap it in another.
 */
export default function Page() {
	const { data: profile } = useUserProfile();
	const isScout = getUserType(profile) === 'scout';
	// Scout's Deck Screener is "Soon" in the panel until it is confirmed live
	// (handover v1 §2). Opened by direct link it shows the Soon state inside the
	// Deal Flow frame, not the upload screen (fix list 17 Nov, 3.1).
	if (isScout && DECK_SCREENER_SOON) {
		return (
			<Screen>
				<SectionHeader />
				<Empty>
					<span className="atlas-soon" style={{ marginRight: 8 }}>Soon</span>
					Deck Screener is coming soon. Upload a deck and get a structured read: strengths, diligence flags and gaps to probe.
				</Empty>
			</Screen>
		);
	}
	return <DeckSummary copy={isScout ? SCREENER_COPY : undefined} mode={isScout ? 'investor' : 'founder'} header={(actions) => <SectionHeader actions={actions} />} />;
}
