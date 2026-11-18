'use client';

import { notFound } from 'next/navigation';
import { useBenchmarkSettings } from '@/components/features/benchmark/settings';
import { EntryGate } from '@/components/features/benchmark/entry-gate';
import { PersonalReport } from '@/components/features/benchmark/personal-report';
import { ReportFrame } from '@/components/features/benchmark/report-frame';

/** R3 — Your benchmark. The contributor's verified email only. */
export default function YourBenchmarkPage() {
	const { enabled, isLoading } = useBenchmarkSettings();
	if (isLoading) return null;
	if (!enabled) notFound();
	return (
		<EntryGate entry="r3">
			{(access) => <ReportFrame><PersonalReport access={access} /></ReportFrame>}
		</EntryGate>
	);
}
