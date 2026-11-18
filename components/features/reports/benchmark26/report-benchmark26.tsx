"use client";

import useSWR from "swr";
import { qk } from "@/lib/query-keys";
import PublicReport, { type PublicReportData } from "./public-report";
import { BENCHMARK26_DEFAULTS } from "./content-defaults";
import { ReportFrame } from "@/components/features/benchmark/report-frame";

/**
 * The Sports Tech VC Deal Sourcing Benchmark 2026 — its document lives in
 * reports.content (slug `investors-survey26`) and nowhere else: no bundled
 * copy, so the full report never reaches a browser that the API refused.
 * `content` (the admin preview's draft) skips the fetch.
 */
const REQUIRED = ["meta", "intro", "sections", "closing", "methodology"] as const;

export default function ReportBenchmark26({ content }: { content?: Record<string, unknown> | null; preview?: boolean } = {}) {
	const { data: doc, isLoading, error } = useSWR<{ content?: Record<string, unknown> | null }>(content !== undefined ? null : qk.reports.detail("investors-survey26"), { shouldRetryOnError: false });
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
	return <PublicReport data={{ ...BENCHMARK26_DEFAULTS, ...ov } as unknown as PublicReportData} />;
}
