"use client";

import useSWR from "swr";
import { qk } from "@/lib/query-keys";
import PublicReport, { type PublicReportData } from "./public-report";
import { ReportFrame } from "@/components/features/benchmark/report-frame";
import { lockedNow } from "../locked-part";

/**
 * The VC Deal Sourcing Benchmark template — its whole document (copy, figures, labels, page
 * order) lives in reports.content and nowhere else: no bundled copy, so the full report never
 * reaches a browser that the API refused. `content` (the admin preview's draft) skips the fetch.
 */
const REQUIRED = ["meta", "intro", "sections", "closing", "methodology", "ui", "partOrder"] as const;

export default function ReportBenchmark26({ slug = "investors-survey26", content }: { slug?: string; content?: Record<string, unknown> | null; preview?: boolean } = {}) {
	const { data: doc, isLoading, error } = useSWR<{ content?: Record<string, unknown> | null }>(content !== undefined ? null : qk.reports.detail(slug), { shouldRetryOnError: false });
	const ov = (content !== undefined ? content : doc?.content) ?? {};
	if (content === undefined && isLoading) return <ReportFrame loading />;
	// The admin preview renders any draft; its error boundary catches a broken one.
	if (content === undefined && !REQUIRED.every((k) => ov[k] !== undefined && ov[k] !== null)) {
		return (
			<ReportFrame>
				<div className="bm-empty" style={{ marginTop: 40 }}>
					{/* 404 = the record isn't published with content yet; anything else is a real failure. */}
					{error && (error as { status?: number }).status !== 404 ? "The full report could not be loaded. Refresh the page to try again." : "The full report is being published. Check back shortly."}
				</div>
			</ReportFrame>
		);
	}
	const data = { ...ov } as unknown as PublicReportData;
	// Admin preview "View as Explore": draw the draft's locked sections as an Explore reader gets them.
	const asExplore = lockedNow(content as Record<string, unknown> | null | undefined, undefined);
	if (asExplore.length) data.sections = data.sections.map((s) => (asExplore.includes(s.id) ? { ...s, locked: true } : s));
	return <PublicReport data={data} slug={slug} />;
}
