'use client';

import useSWR from 'swr';
import { BadgeCheck, Bookmark, Layers, Sparkles, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeedCard, Loading, SectionHead } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { SETUP_CARD_WIZARD, openRaiseSetup, openScoutThesis } from '@/lib/setup-events';
import { PinnedFeedCards } from '@/components/features/pins/pinned-feed-cards';
import { LATEST_MAX, LatestContent } from '@/components/features/home/latest-cards';
import { usePins } from '@/components/features/pins/use-pins';
import { HomeHero } from '@/components/features/home/home-hero';
import { scoutPreferencesPct, setupDone } from '@/lib/profile-completion';
import { useInterests } from '@/components/explore/interests';
import { useScoutFocus } from './use-scout-focus';
import { PillRows } from '@/components/features/home/pill-rows';
import { usePreferencePills } from '@/components/features/home/preference-pills';
import { hrefOf } from '@/lib/routes';
import { currentNames } from '@/lib/atlas-copy';

/**
 * Scout Home, from `GET /api/scout/home`.
 *
 * Everything here used to be derived from `sample-data.ts` — the match count,
 * the deal count, the attention cards. The endpoint has always returned the
 * real read-model; nothing called it.
 *
 * The server owns the derivation on purpose, and the spec it follows is
 * unusually prescriptive: **at most three attention cards, no dashboard
 * statistics, no charts.** So the cards are rendered as given rather than
 * re-derived here, and `snapshot` is copy for the cards, not a stat row.
 */
interface AttentionCard {
	id: string;
	title: string;
	why: string;
	cta_label: string;
	cta_href: string;
	count?: number;
}

interface ScoutHomeData {
	needs_setup: boolean;
	verification: 'unverified' | 'pending' | 'verified';
	scout: { fund_name: string | null; investor_type: string | null } | null;
	thesis_set: boolean;
	snapshot: { watchlist_companies: number; thesis_dimensions: number };
	attention: AttentionCard[];
}

/** Card id → icon. An unknown id still renders, with a neutral icon. */
const CARD_ICON: Record<string, LucideIcon> = {
	'finish-setup': Target,
	onboarding: Target,
	thesis: Target,
	'new-matches': Sparkles,
	'first-watchlist': Bookmark,
	'watchlist-signals': Bookmark,
	verification: BadgeCheck,
};

export function ScoutHome() {
	// Regions and sectors come from Preferences, stages from the Scouting focus
	// block (D1, 1.3): the thesis copy of them is no longer read here.
	const { value: prefs } = useInterests();
	const { focus } = useScoutFocus(true);
	const { data, isLoading } = useSWR<ScoutHomeData>(qk.scout.home());
	const tags = usePreferencePills(prefs, focus.stages);
	const pct = scoutPreferencesPct(prefs, focus);

	const { pins } = usePins();
	// A setup task stops showing at 80% complete (handover v1 §7).
	const tasks = (data?.attention ?? []).filter((c) => !(SETUP_CARD_WIZARD[c.id] && setupDone(pct)));

	if (isLoading) return <Loading />;

	return (
		<div className="scout-home">
			<HomeHero tier="scout" below={tags.length > 0 ? (
				<div className="scout-home__thesis">
					<span className="atlas-eyebrow">Tuned to your preferences</span>
					{/* Two lines at most, then "+N" to Preferences (4.3). */}
					<PillRows pills={tags} moreHref={hrefOf('interests')} />
				</div>
			) : undefined} />

			<section className="scout-home__attn">
				<SectionHead title="Latest from Atlas" />
				<div className="atlas-feed-grid">
					{/* Pinned items first, marked "Pinned"; the filled pin unpins (fix brief N1). */}
					<PinnedFeedCards />
					{/* Server-ranked task cards, already capped at three. */}
					{tasks.map((c) => (
						<FeedCard
							key={c.id}
							tag={c.count != null ? `${c.count}` : 'Scout'}
							icon={CARD_ICON[c.id] ?? Sparkles}
							title={currentNames(c.title)}
							body={currentNames(c.why)}
							// Task cards keep their own action (fix list 1.16).
							actionLabel={c.cta_label}
							// Setup cards open the wizard in place; everything else keeps
							// its server-built link. Keyed on the card's stable `id`, not
							// on `cta_href` — the hrefs are the thing being retired.
							{...(SETUP_CARD_WIZARD[c.id]
								? { onAction: SETUP_CARD_WIZARD[c.id] === 'raise' ? openRaiseSetup : openScoutThesis }
								: { href: c.cta_href })}
						/>
					))}
					<FeedCard
						tag="Deal Flow" icon={Layers}
						title="Live raises from the Circle"
						body="Featured deals and verified raises, ranked by thesis fit."
						href={hrefOf('deal-flow')}
					/>
					{/* Then the newest content until there are six cards (Home, 11). */}
					<LatestContent slots={LATEST_MAX - pins.length - tasks.length - 1} />
				</div>
			</section>
		</div>
	);
}

