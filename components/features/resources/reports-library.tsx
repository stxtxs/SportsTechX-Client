'use client';

import { useMemo } from 'react';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import { downloadReport } from '@/lib/report-pdf';
import type { Page, ReportListItem } from '@/types/api';
import { ENTRY_PATH, ENTRY_TITLE, FLAGS, FTR_SLUG, LOCKED_HINT, RELEASE_DATE, SLUG, UPGRADE_PATH } from '@/components/features/benchmark/config';
import { yoursFirst } from '@/components/features/benchmark/rules';
import { useBenchmarkAccess, useHomePins } from '@/components/features/benchmark/use-benchmark';
import type { BenchmarkAccess, HomePin } from '@/components/features/benchmark/types';
import { ResourceLibrary } from './resource-library';
import type { Resource } from './resource-contract';

const toResource = (r: ReportListItem): Resource => ({
	id: r.id,
	title: r.title,
	desc: r.description ?? '',
	date: r.report_year
		? `${r.report_year}-${String(r.report_month ?? 1).padStart(2, '0')}-01`
		: r.created_at,
	// Reports are dated by month (or only year) — never show an invented day.
	dateLabel: r.report_year
		? (r.report_month ? new Date(r.report_year, r.report_month - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : String(r.report_year))
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
});

const openTab = (path: string) => () => window.open(path, '_blank', 'noopener');

/**
 * The VC Benchmark's entries in the library. R2 is a real `reports` row; R1
 * and R3 are new records that may not be published yet, so they are added
 * here (from R2's metadata) when the list doesn't carry them.
 *
 *   Explore              the summary (open) and the full report (locked:
 *                        hover says what opens it, Access goes to Solutions)
 *   Raise, Scout,        the full report only; contributors also get
 *   contributors         "Your benchmark"
 */
function withBenchmark(rows: ReportListItem[], items: Resource[], a: BenchmarkAccess, pins: HomePin[], pin: (key: string) => void): Resource[] {
	const r2Row = rows.find((r) => r.slug === SLUG.r2);
	const base: Omit<Resource, 'id' | 'title' | 'desc' | 'access'> = {
		date: r2Row ? toResource(r2Row).date : RELEASE_DATE,
		dateLabel: r2Row ? toResource(r2Row).dateLabel : undefined,
		tags: r2Row?.tags ?? [],
		cover: r2Row?.cover_url,
	};
	// "Pin to home" only for an unpinned card that is still featured.
	const today = new Date().toISOString().slice(0, 10);
	const pinFor = (entry: HomePin['entry']) => {
		const p = pins.find((x) => x.entry === entry);
		return p && !p.pinned && p.featured_until >= today ? () => pin(p.key) : undefined;
	};
	const bySlug = (slug: string) => rows.find((r) => r.slug === slug)?.id;

	// The full report as this viewer sees it: open, or locked → Solutions.
	const locked = a.entries.r2 === 'locked';
	const r2Lock: Partial<Resource> = locked
		? { badge: 'locked', onView: undefined, href: UPGRADE_PATH, external: false, actionLabel: 'Access', hint: LOCKED_HINT, onDownload: undefined }
		: {};

	const out = items.map((it) => {
		const row = rows.find((r) => r.id === it.id);
		if (row?.slug === SLUG.r2) {
			return { ...it, access: 'Premium' as const, onView: openTab(ENTRY_PATH.r2), onPin: pinFor('r2'), ...r2Lock };
		}
		if (row?.slug === FTR_SLUG) return { ...it, onPin: pinFor('ftr') };
		if (row?.slug === SLUG.r1) return { ...it, access: 'Free' as const, onView: openTab(ENTRY_PATH.r1), onPin: pinFor('r1') };
		if (row?.slug === SLUG.r3) return { ...it, badge: 'yours' as const, featuredLabel: 'Your benchmark', onView: openTab(ENTRY_PATH.r3), onPin: pinFor('r3') };
		return it;
	}).filter((it) => {
		const slug = rows.find((r) => r.id === it.id)?.slug;
		// Paid users see the full report only; R3 only for its contributor.
		return !(slug === SLUG.r1 && a.entries.r1 !== 'open') && !(slug === SLUG.r3 && a.entries.r3 !== 'open');
	});

	if (!bySlug(SLUG.r2)) {
		out.push({ ...base, id: SLUG.r2, title: ENTRY_TITLE.r2, desc: 'How sports tech investors find, screen and close deals, and where the gaps are. For Raise and Scout members and survey contributors.', access: 'Premium', onView: openTab(ENTRY_PATH.r2), onPin: pinFor('r2'), ...r2Lock });
	}
	if (a.entries.r1 === 'open' && !bySlug(SLUG.r1)) {
		out.push({ ...base, id: SLUG.r1, title: ENTRY_TITLE.r1, desc: 'The headline findings from the benchmark of how sports tech investors source deals. Free for every Atlas member.', access: 'Free', onView: openTab(ENTRY_PATH.r1), onPin: pinFor('r1') });
	}
	if (a.entries.r3 === 'open' && !bySlug(SLUG.r3)) {
		out.push({ ...base, id: SLUG.r3, title: ENTRY_TITLE.r3, desc: 'Your fund’s answers against the 2026 benchmark: channels, ratings and the gaps worth closing. Only you can see it.', access: 'Free', badge: 'yours', featuredLabel: 'Your benchmark', onView: openTab(ENTRY_PATH.r3), onPin: pinFor('r3') });
	}
	// Explore: pair the summary with its locked full report at the top.
	const isEntry = (it: Resource, slug: string) => it.id === slug || rows.find((r) => r.id === it.id)?.slug === slug;
	const r2 = out.find((it) => isEntry(it, SLUG.r2));
	return locked && r2 ? out.map((it) => (isEntry(it, SLUG.r1) ? { ...it, pairWith: r2.id } : it)) : out;
}

/** Explore: the summary first, its locked full report beside it (see `pairWith`). */
function pairSummary(list: Resource[]): Resource[] {
	const r1 = list.find((r) => r.pairWith);
	const r2 = r1 && list.find((r) => r.id === r1.pairWith);
	if (!r1 || !r2) return list;
	return [r1, r2, ...list.filter((r) => r !== r1 && r !== r2)];
}

export function ReportsLibrary() {
	// One page covers the whole library — 33 reports today. `pageQuerySchema`
	// caps limit at 200.
	const res = useSWR<Page<ReportListItem>>(qk.reports.list({ limit: 100 }));
	const { access } = useBenchmarkAccess();
	const { all: pins, setPinned } = useHomePins();
	// Sort on the displayed date rather than trusting the server's `-report_year`,
	// which puts year-less rows first — wrong for a hero.
	const items = useMemo(() => {
		const rows = res.data?.data ?? [];
		let list = rows.map(toResource);
		if (FLAGS.benchmark && rows.length > 0) list = withBenchmark(rows, list, access, pins, (key) => void setPinned(key, true));
		list.sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
		const yours = list.find((r) => r.badge === 'yours');
		return yours ? yoursFirst(list, yours.id) : pairSummary(list);
	}, [res.data, access, pins, setPinned]);

	return (
		<ResourceLibrary
			items={items}
			kind="report"
			isLoading={res.isLoading}
			intro="Market sizing, funding trends and category maps from SportsTechX research — across regions, sports and sectors."
			featuredLabel="Latest report"
			libraryTitle="Reports library"
			noun="report"
			viewLabel="View report"
		/>
	);
}
