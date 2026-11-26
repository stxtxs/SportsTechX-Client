'use client';

import useSWR from 'swr';
import { Loader2, Settings, FileCheck, Bookmark, Presentation, CalendarCheck, UserRound, Hourglass, Send, Activity, FolderCheck, Sparkles } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { SETUP_CARD_WIZARD, openRaiseSetup, openScoutThesis } from '@/lib/setup-events';
import { Badge, SectionHead, FeedCard, Progress } from '@/components/atlas';
import { PinnedFeedCards } from '@/components/features/pins/pinned-feed-cards';
import { fmtAmount, fmtFullDate } from '@/lib/format';
import { HomeHero } from '@/components/features/home/home-hero';
import { raisePct, setupDone } from '@/lib/profile-completion';
import { currentNames } from '@/lib/atlas-copy';

/**
 * Atlas Raise — Home. Search-first: a centred composer as the focal point, with
 * "Latest from Atlas" as elongated cards peeking from the bottom edge
 * (scroll to reveal more). Data unchanged (GET /api/raise/home); only `attention`
 * is used here now. The search bar is UI-only for now (see RaiseSearch).
 *
 * A component rather than a page: `/app` picks one of the three product homes
 * by tier, the way Explore and Scout always did.
 */

interface Attention { id: string; title: string; why: string; cta_label: string; cta_href: string; count?: number }
interface Round {
	round_type: string | null; round_type_other?: string | null; target_amount: string | number | null; committed_amount: string | number | null;
	currency_code: string | null; target_close_date: string | null; status: string | null;
}
interface Home { needs_setup?: boolean; raise?: Round | null; attention: Attention[] }

const ROUND_NAME: Record<string, string> = { pre_seed: 'Pre-seed', seed: 'Seed', series_a: 'Series A', series_b_plus: 'Series B+', bridge: 'Bridge' };
const money = (v: number, ccy: string) => fmtAmount(v, ccy);
/** Whole days from today to a YYYY-MM-DD date, in the viewer's own calendar. */
const daysUntil = (ymd: string) => {
	const [y, m, d] = ymd.slice(0, 10).split('-').map(Number);
	const today = new Date(); today.setHours(0, 0, 0, 0);
	return Math.round((new Date(y!, m! - 1, d!).getTime() - today.getTime()) / 864e5);
};

/** The round at a glance, as the first "needs your attention" card: countdown to
 *  the founder's target close date (title), committed vs target (body + bar).
 *  Both come from Raise Setup; the action re-opens it to edit. */
function RoundCard({ r }: { r: Round }) {
	const ccy = (r.currency_code || 'EUR').toUpperCase();
	const target = Number(r.target_amount) || 0;
	const committed = Number(r.committed_amount) || 0;
	const ended = r.status === 'funded' || r.status === 'closed';
	const days = r.target_close_date ? daysUntil(r.target_close_date) : null;
	const closeOn = r.target_close_date ? fmtFullDate(new Date(`${r.target_close_date.slice(0, 10)}T00:00`)) : null;
	const name = ROUND_NAME[r.round_type ?? ''] ?? (r.round_type === 'other' && r.round_type_other?.trim() ? r.round_type_other.trim() : undefined);
	// "Angel round" (typed for an "Other" round) is already a round name.
	const roundName = name ? (/\bround$/i.test(name) ? name : `${name} round`) : null;
	const plural = (n: number) => `${n} ${n === 1 ? 'day' : 'days'}`;

	const title = ended ? `${roundName ?? 'Your round'} ${r.status}`
		: days == null ? 'Set a target close date'
		: days > 0 ? `${plural(days)} to your target close`
		: days === 0 ? 'Your target close is today'
		: `${plural(-days)} past your target close`;
	const amounts = target <= 0 ? null
		: ended && committed === 0 ? `Target ${money(target, ccy)}` // funded, nothing recorded: don't say "€0 committed"
		: `${money(committed, ccy)} of ${money(target, ccy)} committed`;
	const body = [
		amounts ?? (ended ? null : 'Add how much you’re raising to track progress.'),
		!ended && closeOn ? `Target close ${closeOn}` : null,
		r.status === 'paused' ? 'Raise paused' : null,
	].filter(Boolean).join(' · ');
	// A round marked funded with nothing recorded as committed: no empty bar
	// contradicting the title.
	const showBar = target > 0 && !(ended && committed === 0);

	return (
		<FeedCard
			id="round"
			tag={roundName ?? 'Your round'}
			icon={Hourglass}
			title={title}
			body={body || undefined}
			onAction={() => openRaiseSetup({ edit: true })}
			actionLabel={days != null && days < 0 && !ended ? 'Update date' : 'Edit round'}
			extra={showBar ? <Progress pct={(committed / target) * 100} /> : undefined}
		/>
	);
}

/** Category tag + icon per attention item (ids come from the raise-home service). */
const ATTENTION_TAG: Record<string, { tag: string; icon: LucideIcon }> = {
	setup: { tag: 'Setup', icon: Settings },
	deck: { tag: 'Pitch deck', icon: FileCheck },
	overdue: { tag: 'Watchlist', icon: Bookmark },
	'next-steps': { tag: 'Watchlist', icon: Bookmark },
	amounts: { tag: 'Watchlist', icon: Bookmark },
	'add-first': { tag: 'Investors', icon: Presentation },
	strategy: { tag: 'Strategy', icon: CalendarCheck },
	outreach: { tag: 'Pipeline', icon: Send },
	quiet: { tag: 'Momentum', icon: Activity },
	readiness: { tag: 'Readiness', icon: FolderCheck },
	'deck-improve': { tag: 'Pitch deck', icon: FileCheck },
	dealflow: { tag: 'Investor Circle', icon: Sparkles },
	matches: { tag: 'Investors', icon: Presentation },
};
const DEFAULT_TAG = { tag: 'For you', icon: UserRound };

export function RaiseHome() {
	const { data, isLoading } = useSWR<Home>(qk.raise.home());
	// Same key as Raise settings, so no extra request once either has loaded.
	const current = useSWR<{ raise: Record<string, unknown> | null; criteria: Record<string, unknown> | null }>(qk.raise.current());
	const setupComplete = setupDone(raisePct(current.data?.raise, current.data?.criteria));

	if (isLoading || !data) {
		return <div className="raise-home"><div style={{ display: 'grid', placeItems: 'center', minHeight: '60vh' }}><Loader2 className="animate-spin" size={22} /></div></div>;
	}

	const showRound = !data.needs_setup && !!data.raise;
	// A setup task stops showing once the setup is 80% complete (handover v1 §7).
	const attention = data.attention.filter((a) => !(SETUP_CARD_WIZARD[a.id] && setupComplete));

	return (
		<div className="raise-home">
			<HomeHero tier="raise" />

			<section className="raise-attn">
				<SectionHead title="Latest from Atlas" />
				{/* Always rendered: pinned reports lead the feed even when there is
				    nothing else to show (fix list 1.15). */}
				{(
					<div className="atlas-feed-grid">
						<PinnedFeedCards />
						{showRound && <RoundCard r={data.raise!} />}
						{attention.map((a) => {
							const t = ATTENTION_TAG[a.id] ?? DEFAULT_TAG;
							return (
								<FeedCard
									key={a.id}
									id={a.id}
									tag={t.tag}
									icon={t.icon}
									title={currentNames(a.title)}
									body={currentNames(a.why)}
									// Task cards keep their own action (fix list 1.16).
									actionLabel={a.cta_label}
									// Setup cards open the wizard in place; everything else keeps
									// its server-built link. Keyed on the card's stable `id`, not
									// on `cta_href` — the hrefs are the thing being retired.
									{...(SETUP_CARD_WIZARD[a.id]
										? { onAction: SETUP_CARD_WIZARD[a.id] === 'raise' ? openRaiseSetup : openScoutThesis }
										// Readiness lives in the raise wizard: re-open it to edit.
										: a.id === 'readiness' ? { onAction: () => openRaiseSetup({ edit: true }) }
										: { href: a.cta_href })}
									extra={a.count != null ? <Badge tone="danger">{a.count} overdue</Badge> : undefined}
								/>
							);
						})}
					</div>
				)}
				{attention.length === 0 && <div className="raise-attn-empty">You’re all caught up. Keep your watchlist moving.</div>}
			</section>
		</div>
	);
}
