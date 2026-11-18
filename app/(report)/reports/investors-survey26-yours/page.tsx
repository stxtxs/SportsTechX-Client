'use client';

import { notFound } from 'next/navigation';
import { FLAGS } from '@/components/features/benchmark/config';
import { EntryGate } from '@/components/features/benchmark/entry-gate';
import { PersonalReport } from '@/components/features/benchmark/personal-report';
import { ReportFrame } from '@/components/features/benchmark/report-frame';

/** R3 — Your benchmark. The contributor's verified email only. */
export default function YourBenchmarkPage() {
	if (!FLAGS.benchmark) notFound();
	return (
		<EntryGate entry="r3">
			{(access) => <ReportFrame><PersonalReport access={access} /></ReportFrame>}
		</EntryGate>
	);
}
