'use client';

import dynamic from 'next/dynamic';
import { ReportErrorBoundary } from '@/components/features/reports/gster26/error-boundary';
import { EntryGate } from '@/components/features/benchmark/entry-gate';

// The ported STX VC Deal Sourcing Benchmark, same URL as on STX. Client-only
// (it reads the reader's theme from localStorage on first render).
const ReportBenchmark26 = dynamic(() => import('@/components/features/reports/benchmark26/report-benchmark26'), { ssr: false });

/**
 * R2 — the full report: Raise or Scout, or an email on the R2 allowlist.
 * Without access: the upgrade screen with R1. The report's document comes
 * from the API (reports.content), never from the bundle.
 */
export default function Benchmark26Page() {
	return (
		<EntryGate entry="r2">
			{() => (
				<ReportErrorBoundary>
					<ReportBenchmark26 />
				</ReportErrorBoundary>
			)}
		</EntryGate>
	);
}
