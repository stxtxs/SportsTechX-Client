'use client';

import useSWR from 'swr';
import { BadgeCheck, Bookmark, CalendarDays, Sparkles, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeedCard, Loading, SectionHead } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import { SETUP_CARD_WIZARD, openRaiseSetup, openScoutThesis } from '@/lib/setup-events';
import { hrefOf } from '@/lib/routes';
import { PinnedFeedCards } from '@/components/features/benchmark/pinned-reports';
import { thesisTags, useThesis } from './use-thesis';
import { HomeHero } from '@/components/features/home/home-hero';
import { setupDone, thesisPct } from '@/lib/profile-completion';
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
	scout: { full_name: string | null; fund_name: string | null; investor_type: string | null } | null;
	thesis_set: boolean;
	snapshot: { watchlist_companies: number; thesis_dimensions: number };
	attention: AttentionCard[];
	prompts: string[];
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
	const [thesis] = useThesis();
	const { data, isLoading } = useSWR<ScoutHomeData>(qk.scout.home());
	const month = new Date(new Date().getFullYear(), new Date().getMonth() - 1)
		.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
	const tags = thesisTags(thesis);

	if (isLoading) return <Loading />;

	return (
		<div className="scout-home">
			<HomeHero tier="scout" below={data?.thesis_set && tags.length > 0 ? (
				<div className="scout-home__thesis">
					<span className="atlas-eyebrow">Tuned to your thesis</span>
					<div className="scout-tags">{tags.map((t) => <span key={t} className="scout-tag">{t}</span>)}</div>
				</div>
			) : undefined} />

			<section className="scout-home__attn">
				<SectionHead title="Latest from Atlas" meta="Based on your thesis" />
				<div className="atlas-feed-grid">
					{/* Pinned reports first, with the pin marker and Unpin (fix list 1.15). */}
					<PinnedFeedCards />
					{/* Server-ranked and already capped at three. */}
					{/* A setup task stops showing at 80% complete (handover v1 §7). */}
					{(data?.attention ?? []).filter((c) => !(SETUP_CARD_WIZARD[c.id] && setupDone(thesisPct(thesis)))).map((c) => (
						<FeedCard
							key={c.id}
							tag={c.count != null ? `${c.count}` : 'Scout'}
							icon={CARD_ICON[c.id] ?? Sparkles}
							title={currentNames(c.title)}
							body={currentNames(c.why)}
							// Setup cards open the wizard in place; everything else keeps
							// its server-built link. Keyed on the card's stable `id`, not
							// on `cta_href` — the hrefs are the thing being retired.
							{...(SETUP_CARD_WIZARD[c.id]
								? { onAction: SETUP_CARD_WIZARD[c.id] === 'raise' ? openRaiseSetup : openScoutThesis }
								: { href: c.cta_href })}
							actionLabel={c.cta_label}
						/>
					))}
					{/* Two standing entry points the read-model does not emit. */}
					<FeedCard
						tag="Monthly Roundup" icon={CalendarDays}
						title={`${month} market roundup`}
						body="Funding, deals and news across sports tech for the month."
						href={hrefOf('roundup')}
					/>
					{/* The Deal Flow card is held back while Deal Flow is "Coming soon"
					    (components/scout/deal-flow-soon.tsx). */}
				</div>
			</section>
		</div>
	);
}

