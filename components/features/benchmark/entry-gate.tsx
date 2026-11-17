'use client';

import Link from 'next/link';
import { useEffect, useRef, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Card } from '@/components/atlas';
import { Events, track } from '@/lib/analytics';
import { ENTRY_PATH, UPGRADE_PATH, type BenchmarkEntry } from './config';
import { ReportFrame } from './report-frame';
import { SummaryReport } from './summary-report';
import { PersonaCta } from './persona-cta';
import { useBenchmarkAccess } from './use-benchmark';
import type { BenchmarkAccess } from './types';

/**
 * Decides what a benchmark URL shows, once per entry.
 *
 * Logged out never reaches here: the edge proxy and `ProtectedRoute` (the
 * `(report)` layout) send them to /login with `redirectTo`. Logged in:
 *
 *   open    → the report (`children`)
 *   locked  → the upgrade screen, which shows R1 — never a 404
 *   none    → R3 for a non-contributor: what it is and how to get one
 *
 * UI only. The server must refuse R2/R3 data to the same callers.
 */
export function EntryGate({ entry, children }: { entry: BenchmarkEntry; children: (access: BenchmarkAccess) => ReactNode }) {
	const { access, isLoading } = useBenchmarkAccess();
	const state = access.entries[entry];
	const logged = useRef('');

	useEffect(() => {
		if (isLoading || logged.current === state) return;
		logged.current = state;
		track(state === 'open' ? Events.reportOpened : Events.reportLockedView, { entry, edition: access.edition });
	}, [isLoading, state, entry, access.edition]);

	if (isLoading) return <ReportFrame loading />;
	if (state === 'open') return <>{children(access)}</>;
	if (state === 'locked') return <UpgradeScreen access={access} />;
	return <NotAContributor access={access} />;
}

/** Logged in without R2: why it is locked, how to open it, and R1 underneath. */
function UpgradeScreen({ access }: { access: BenchmarkAccess }) {
	return (
		<ReportFrame>
			<Card glow="pink" className="bm-lockbar">
				<div className="bm-lockbar__text">
					<span className="bm-lockbar__icon"><Lock size={16} aria-hidden="true" /></span>
					<div>
						<h2>Available with Raise or Scout.</h2>
						<p>Every chart, the channel-by-channel ratings and the methodology. Survey contributors get it free. Here is the summary in the meantime.</p>
					</div>
				</div>
				<Link href={UPGRADE_PATH} className="atlas-btn atlas-btn--primary" onClick={() => track(Events.upgradeClicked, { source: 'r2_locked' })}>See solutions</Link>
			</Card>
			<SummaryReport access={access} embedded />
		</ReportFrame>
	);
}

function NotAContributor({ access }: { access: BenchmarkAccess }) {
	return (
		<ReportFrame>
			<header className="bm-cover">
				<h1>Your benchmark</h1>
				<p>Your benchmark compares one fund’s deal sourcing with the funds in the VC Deal Sourcing Benchmark 2026. It is made for each fund that completes the survey, and only that fund can open it.</p>
			</header>
			<p style={{ fontSize: 14 }}>In the meantime, <Link href={ENTRY_PATH.r1}>read the summary</Link>.</p>
			<PersonaCta access={access} source="r3_not_contributor" />
		</ReportFrame>
	);
}
