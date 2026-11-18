'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { downloadReport } from '@/lib/report-pdf';
import type { Page, ReportListItem } from '@/types/api';
import { ENTRY_PATH, ENTRY_TITLE, FLAGS, RELEASE_DATE, SLUG } from '@/components/features/benchmark/config';
import { yoursFirst } from '@/components/features/benchmark/rules';
import { useBenchmarkAccess } from '@/components/features/benchmark/use-benchmark';
import type { BenchmarkAccess } from '@/components/features/benchmark/types';
import { pinKey, type PinTarget } from '@/components/features/pins/rules';
import { ResourceLibrary } from './resource-library';
import type { Resource } from './resource-contract';
import { fmtMonth } from '@/lib/format';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';

const toResource = (r: ReportListItem): Resource => ({
	id: r.id,
	title: r.title,
	desc: r.description ?? '',
	date: r.report_year
		? `${r.report_year}-${String(r.report_month ?? 1).padStart(2, '0')}-01`
		: r.created_at,
	// Reports are dated by month (or only year) — never show an invented day.
	dateLabel: r.report_year
		? (r.report_month ? fmtMonth(new Date(r.report_year, r.report_month - 1, 1)) : String(r.report_year))
		: undefined,
	access: r.has_pro_version ? 'Premium' : 'Free',
	tags: r.tags ?? [],
	cover: r.cover_url,
	// Only buttons that work. View opens the in-app report page in a NEW TAB
	// (section renderer, or the PDF reader — a locked PDF shows its upgrade
	// message there), so it needs something to read: a web report or a PDF.
	// Download needs a PDF this plan can open. (Undefined = older API: keep both.)
	onView: r.has_sections || r.has_pdf !== false
		? () => window.open(`/reports/${r.slug ?? r.id}`, '_blank', 'noopener')
		: undefined,
	onDownload: r.can_download !== false ? () => void downloadReport(r.slug ?? r.id) : undefined,
	pin: reportPin(r.slug ?? r.id, r.title, r.description ?? ''),
});

const openTab = (path: string) => () => window.open(path, '_blank', 'noopener');

/** Pin to Home target for a report (fix brief N1). */
const reportPin = (slug: string, title: string, body: string): PinTarget => ({ key: pinKey('report', slug), kind: 'report', title, body, href: `/reports/${slug}`, newTab: true });

/**
 * The VC Deal Sourcing Benchmark 2026 (fix brief N2, 17 Nov): one report like
 * any other, not a Summary beside a locked Full Report. It will have gated
 * sections, so on Explore it carries the currency sign; it opens normally and
 * the gating happens inside it.
 *
 * Until it's published to the backend, a placeholder card stands in and opens
 * the draft page. "Your benchmark" stays a separate, personal report, shown
 * only once the server says this user contributed.
 */
function withBenchmark(rows: ReportListItem[], items: Resource[], a: BenchmarkAccess): Resource[] {
	const slugOf = (it: Resource) => rows.find((r) => r.id === it.id)?.slug;
	const hidden = new Set<string>([SLUG.r1, ...(a.entries.r3 === 'open' ? [] : [SLUG.r3])]);
	const out = items
		.filter((it) => !hidden.has(slugOf(it) ?? ''))
		.map((it) => {
			const slug = slugOf(it);
			if (slug === SLUG.r2) return { ...it, access: 'Premium' as const, onView: openTab(ENTRY_PATH.r2) };
			if (slug === SLUG.r3) return { ...it, badge: 'yours' as const, featuredLabel: 'Your benchmark', onView: openTab(ENTRY_PATH.r3) };
			return it;
		});
	const has = (slug: string) => rows.some((r) => r.slug === slug);
	if (!has(SLUG.r2)) {
		const desc = 'How sports tech investors find, screen and close deals, and where the gaps are.';
		out.push({
			id: SLUG.r2, title: ENTRY_TITLE.r2, desc, date: RELEASE_DATE, dateLabel: fmtMonth(RELEASE_DATE), tags: [],
			access: 'Premium', onView: openTab(ENTRY_PATH.r2), pin: reportPin(SLUG.r2, ENTRY_TITLE.r2, desc),
		});
	}
	if (a.entries.r3 === 'open' && !has(SLUG.r3)) {
		const desc = 'Your fund’s answers against the 2026 benchmark: channels, ratings and the gaps worth closing. Only you can see it.';
		out.push({
			id: SLUG.r3, title: ENTRY_TITLE.r3, desc, date: RELEASE_DATE, dateLabel: fmtMonth(RELEASE_DATE), tags: [],
			access: 'Free', badge: 'yours', featuredLabel: 'Your benchmark', onView: openTab(ENTRY_PATH.r3), pin: reportPin(SLUG.r3, ENTRY_TITLE.r3, desc),
		});
	}
	return out;
}

export function ReportsLibrary() {
	// One page covers the whole library — 33 reports today. `pageQuerySchema`
	// caps limit at 200.
	const res = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	const { access } = useBenchmarkAccess();
	// The gated-report sign is Explore's only (fix brief N2).
	const { data: profile } = useUserProfile();
	const isExplore = getUserType(profile) === 'explore';
	// Sort on the displayed date rather than trusting the server's `-report_year`,
	// which puts year-less rows first — wrong for a hero.
	const items = useMemo(() => {
		const rows = res.data?.data ?? [];
		let list = rows.map(toResource);
		if (FLAGS.benchmark && rows.length > 0) list = withBenchmark(rows, list, access);
		list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
		// Until the list API says which reports have gated sections (backend
		// brief), "gated" means a PRO edition exists, or it's the Benchmark.
		if (isExplore) list = list.map((r) => ({ ...r, gated: r.access === 'Premium' }));
		const yours = list.find((r) => r.badge === 'yours');
		return yours ? yoursFirst(list, yours.id) : list;
	}, [res.data, access, isExplore]);

	return (
		<ResourceLibrary
			items={items}
			kind="report"
			isLoading={res.isLoading}
			intro="Market sizing, funding trends and category maps from SportsTechX research — across regions, sports and sectors."
			featuredLabel="Latest report"
			libraryTitle="Reports library"
			noun="report"
			viewLabel="Open"
		/>
	);
}
