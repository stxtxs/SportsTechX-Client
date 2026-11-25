'use client';

import { Fragment } from 'react';
import { BookOpen, CalendarDays, Files, Newspaper } from 'lucide-react';
import useSWR from 'swr';
import { FeedCard } from '@/components/atlas';
import { usePinnedKeys } from '@/components/features/pins/pinned-feed-cards';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { fmtFullDate, fmtMonth } from '@/lib/format';
import type { NewsletterArticle, Page, ReportListItem } from '@/types/api';

/** Last month's market roundup: a standing card in "Latest from Atlas". */
export function RoundupCard() {
	const lastMonth = fmtMonth(new Date(new Date().getFullYear(), new Date().getMonth() - 1));
	return <FeedCard tag="Monthly roundup" icon={CalendarDays} title={`${lastMonth} market roundup`} body="The month’s most relevant funding rounds, acquisitions and industry developments in one read." href={hrefOf('roundup')} />;
}

/** "Latest from Atlas" holds up to six cards (Home, 11). */
export const LATEST_MAX = 6;

interface Item { key: string; card: React.ReactNode }

/**
 * The newest content after the pinned cards, until `slots` are filled or
 * nothing is left (Home, 11): reports, newsletter editions, the monthly roundup
 * and (on Raise, where they exist) guides. Types take turns in that order,
 * each newest first, so weekly newsletters can't fill every slot. A pinned
 * item is never repeated.
 */
export function LatestContent({ slots, guides = false }: { slots: number; guides?: boolean }) {
	const news = useSWR<NewsletterArticle[]>(qk.newsletter.articles());
	const reports = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	const guideRows = useSWR<{ data: { slug: string; title: string; summary: string }[] }>(guides ? qk.raise.resources() : null);
	const pinned = usePinnedKeys();
	// Wait for both lists, so the cards don't reshuffle as the second arrives.
	if (slots <= 0 || news.isLoading || reports.isLoading || (guides && guideRows.isLoading)) return null;

	const reportCards: Item[] = [...(reports.data?.data ?? [])]
		.sort((a, b) => (b.report_year ?? 0) - (a.report_year ?? 0) || (b.report_month ?? 0) - (a.report_month ?? 0))
		.filter((r) => !pinned.has(`report:${r.slug ?? r.id}`))
		.map((r) => ({
			key: `report:${r.slug ?? r.id}`,
			card: <FeedCard tag="Report" icon={Files} title={r.title} body={`${r.report_year ?? ''} · ${r.description ?? ''}`.trim()} onAction={() => window.open(`/reports/${r.slug ?? r.id}`, '_blank', 'noopener')} />,
		}));
	const newsCards: Item[] = [...(news.data ?? [])]
		.sort((a, b) => Date.parse(b.pubDate) - Date.parse(a.pubDate))
		.filter((a) => !pinned.has(`newsletter:${a.slug}`))
		.map((a) => ({
			key: `newsletter:${a.slug}`,
			card: <FeedCard tag="Newsletter" icon={Newspaper} title={a.title} body={`${fmtFullDate(a.pubDate)} · ${a.description}`} onAction={() => window.open(a.link, '_blank', 'noopener')} />,
		}));
	const roundupCards: Item[] = [{ key: 'roundup', card: <RoundupCard /> }];
	const guideCards: Item[] = (guideRows.data?.data ?? [])
		.filter((g) => !pinned.has(`guide:${g.slug}`))
		.map((g) => ({ key: `guide:${g.slug}`, card: <FeedCard tag="Fundraising Guide" icon={BookOpen} title={g.title} body={g.summary} href={`${hrefOf('guide')}/${g.slug}`} /> }));

	const queues = [reportCards, newsCards, roundupCards, guideCards];
	const out: Item[] = [];
	for (let round = 0; out.length < slots && queues.some((q) => q.length > round); round++) {
		for (const q of queues) if (q[round] && out.length < slots) out.push(q[round]!);
	}
	return <>{out.map((i) => <Fragment key={i.key}>{i.card}</Fragment>)}</>;
}
