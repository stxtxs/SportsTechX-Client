'use client';

import { notFound } from 'next/navigation';
import { FLAGS } from '@/components/features/benchmark/config';
import { EntryGate } from '@/components/features/benchmark/entry-gate';
import { ReportFrame } from '@/components/features/benchmark/report-frame';
import { SummaryReport } from '@/components/features/benchmark/summary-report';

/** R1 — VC Deal Sourcing Benchmark 2026: Summary. Any signed-in user. */
export default function BenchmarkSummaryPage() {
	if (!FLAGS.benchmark) notFound();
	return (
		<EntryGate entry="r1">
			{(access) => <ReportFrame><SummaryReport access={access} /></ReportFrame>}
		</EntryGate>
	);
}
