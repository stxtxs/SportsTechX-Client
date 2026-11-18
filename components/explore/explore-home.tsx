'use client';

import { Newspaper, Files, CalendarDays, UserRound } from 'lucide-react';
import { FeedCard, SectionHead } from '@/components/atlas';
import useSWR from 'swr';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { qk } from '@/lib/query-keys';
import type { NewsletterArticle, Page, ReportListItem } from '@/types/api';
import { useInterests, type Interests } from './interests';
import { hrefOf } from '@/lib/routes';
import { fmtFullDate, fmtMonth } from '@/lib/format';
import { PinnedFeedCards, usePinnedKeys } from '@/components/features/pins/pinned-feed-cards';
import { HomeHero } from '@/components/features/home/home-hero';
import { preferencesPct, setupDone } from '@/lib/profile-completion';

/**
 * Explore Home (Claude Design "Home"): greeting, interests count, a search bar
 * (searches the live company database) and "Latest from Atlas". Every
 * card is live; "For you" reads the interests saved via `/api/explore/interests`.
 */
const fmt = (d: string) => fmtFullDate(d);
const COMPANIES = hrefOf('companies');

/**
 * "For you" links to a filter the Companies page really applies — a top sector
 * (`?sector=<slug>`) or a sport (`?sport=<id>`) — and its title names that
 * filter. It used to send the sector *name* as `?q=`, a company-name search.
 * A sub-sector maps to its pillar (sub filters are an advanced-filter feature);
 * regions have no single company filter, so they get the whole list. Null while
 * the taxonomy loads, so the title never shows a raw id.
 */
function forYouLink(v: Interests, sectors: SectorRef[], picked: string[]): { title: string; href: string } | null {
	const byId = new Map(sectors.map((s) => [s.id, s]));
	const sectorId = v.sectors[0] ?? v.subs[0];
	if (sectorId) {
		let s = byId.get(sectorId);
		for (let d = 0; s?.parent_id && byId.has(s.parent_id) && d < 6; d++) s = byId.get(s.parent_id);
		return s ? { title: `Companies in ${s.name}`, href: `${COMPANIES}?sector=${encodeURIComponent(s.slug)}` } : null;
	}
	const sport = v.sports[0];
	// With no sector picked, picked[0] is the first sport's name (or its id until sports load).
	if (sport) return picked[0] && picked[0] !== sport ? { title: `Companies in ${picked[0]}`, href: `${COMPANIES}?sport=${encodeURIComponent(sport)}` } : null;
	return { title: 'Browse the company database', href: COMPANIES };
}

export function ExploreHome() {
	const { value: interests, picked } = useInterests();
	// Same key (and hour-long dedupe) as the interest options — no extra request.
	const { data: sectorData } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const forYou = forYouLink(interests, Array.isArray(sectorData) ? sectorData : (sectorData?.data ?? []), picked);
	// Shares its SWR key with the Newsletter page, so visiting both costs one
	// request. Editions arrive newest-first from the feed, but sort rather than
	// trust that — the hero must genuinely be the latest.
	const news = useSWR<NewsletterArticle[]>(qk.newsletter.articles());
	// An item appears once on Home: skip the newest edition or report when it's
	// already pinned above (fix brief N1).
	const pinned = usePinnedKeys();
	const latestNews = [...(news.data ?? [])]
		.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
		.find((a) => !pinned.has(`newsletter:${a.slug}`));
	// Shares the Reports library's SWR key, so visiting both costs one request.
	// Deliberately not `limit: 1`: the list default sorts by `-created_at` and
	// the `-report_year` sort puts year-less rows FIRST, so a single row is the
	// wrong report either way (measured: it returns a 2021 edition). The whole
	// set is 33 rows / 23KB, so sorting client-side is the cheaper correct option.
	const reports = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	const latestReport = [...(reports.data?.data ?? [])]
		.sort((a, b) => (b.report_year ?? 0) - (a.report_year ?? 0) || (b.report_month ?? 0) - (a.report_month ?? 0))
		.find((r) => !pinned.has(`report:${r.slug ?? r.id}`));
	const lastMonth = fmtMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1));


	return (
		<div className="explore-home">
			<HomeHero tier="explore" settingsMeta={picked.length > 0 ? picked.length : undefined} />

			<section className="explore-home__attn">
				<SectionHead title="Latest from Atlas" meta={picked.length > 0 ? 'Based on your interests · updated today' : 'Updated today'} />
				<div className="atlas-feed-grid">
					{/* Pinned items first, marked "Pinned"; the filled pin unpins (fix brief N1). */}
					<PinnedFeedCards />
					{latestNews && (
						<FeedCard tag="Newsletter" icon={Newspaper} title={latestNews.title} body={`${fmt(latestNews.pubDate)} · ${latestNews.description}`} href={hrefOf('newsletter')} />
					)}
					{latestReport && (
						<FeedCard tag="Report" icon={Files} title={latestReport.title} body={`${latestReport.report_year ?? ''} · ${latestReport.description ?? ''}`.trim()} href={hrefOf('reports')} />
					)}
					<FeedCard tag="Monthly roundup" icon={CalendarDays} title={`${lastMonth} market roundup`} body="The month’s most relevant funding rounds, acquisitions and industry developments in one read." href={hrefOf('roundup')} />
					{/* Setup is a task until preferences are 80% complete (handover v1 §7). */}
					{!setupDone(preferencesPct(interests)) ? (
						<FeedCard tag="For you" icon={UserRound} title="Set up your preferences" body="Set up your preferences and Atlas tunes Home to them." href={hrefOf('interests')} actionLabel="Set up your preferences" />
					) : forYou && (
						<FeedCard
							id="for-you"
							tag="For you" icon={UserRound}
							title={forYou.title}
							body={`Because you follow ${picked.slice(0, 3).join(', ')}${picked.length > 3 ? ` and ${picked.length - 3} more` : ''}.`}
							href={forYou.href}
						/>
					)}
				</div>
			</section>
		</div>
	);
}
