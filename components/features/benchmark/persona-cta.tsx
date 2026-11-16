'use client';

import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Button, Card, PlaceholderTag } from '@/components/atlas';
import { getAccountType, getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { Events, track } from '@/lib/analytics';
import { ENTRY_PATH, SURVEY_URL, UPGRADE_PATH } from './config';
import type { BenchmarkAccess } from './types';

type Persona = 'investor' | 'founder' | 'unknown';

/** Declared persona first; an undeclared one is read off the plan they bought. */
export function usePersona(): Persona {
	const { data: profile } = useUserProfile();
	const declared = getAccountType(profile);
	if (declared === 'investor' || declared === 'founder') return declared;
	const tier = getUserType(profile);
	return tier === 'scout' ? 'investor' : tier === 'raise' ? 'founder' : 'unknown';
}

function SurveyButton({ source }: { source: string }) {
	if (!SURVEY_URL) return <><Button disabled>Take the survey</Button> <PlaceholderTag short /></>;
	return (
		<a href={SURVEY_URL} target="_blank" rel="noopener noreferrer" className="atlas-btn atlas-btn--primary" onClick={() => track(Events.upgradeClicked, { source, target: 'survey' })}>
			Take the survey <ArrowUpRight size={13} />
		</a>
	);
}

function UpgradeButton({ source, label }: { source: string; label: string }) {
	return (
		<Link href={UPGRADE_PATH} className="atlas-btn atlas-btn--primary" onClick={() => track(Events.upgradeClicked, { source, target: 'plans' })}>
			{label} <ArrowUpRight size={13} />
		</Link>
	);
}

/**
 * The R1 call to action, by persona. Investors are pointed to the survey
 * (personal benchmark + a free month of Scout), founders to Raise. A
 * contributor already has their benchmark, so they get a link to it instead.
 */
export function PersonaCta({ access, source }: { access: BenchmarkAccess; source: string }) {
	const persona = usePersona();

	if (access.entries.r3 === 'open') {
		return (
			<Card glow="blue" className="bm-cta">
				<h2 className="bm-cta__title">Your benchmark is ready</h2>
				<p className="bm-cta__body">See how your fund’s sourcing compares with the funds in the benchmark.</p>
				<Button href={ENTRY_PATH.r3}>Open your benchmark</Button>
			</Card>
		);
	}

	if (persona === 'founder') {
		return (
			<Card glow="pink" className="bm-cta">
				<h2 className="bm-cta__title">Upgrade to Raise for the full report</h2>
				<p className="bm-cta__body">Learn which channels investors trust most and how they screen, so you reach the right funds the way they prefer to be reached.</p>
				{access.entries.r2 === 'open'
					? <Button href={ENTRY_PATH.r2}>Read the full report</Button>
					: <UpgradeButton source={source} label="Upgrade to Raise" />}
			</Card>
		);
	}

	if (persona === 'investor') {
		return (
			<Card glow="blue" className="bm-cta">
				<h2 className="bm-cta__title">Get your personal benchmark and a free month of Scout</h2>
				<p className="bm-cta__body">Answer the survey and we compare your fund with the benchmark: your channels, your ratings and the gaps worth closing. Takes about ten minutes.</p>
				<div className="bm-actions"><SurveyButton source={source} /></div>
			</Card>
		);
	}

	// Undeclared on the free plan: offer both doors.
	return (
		<Card className="bm-cta">
			<h2 className="bm-cta__title">Go further</h2>
			<p className="bm-cta__body">Investors: take the survey for your personal benchmark and a free month of Scout. Founders: upgrade to Raise for the full report.</p>
			<div className="bm-actions">
				<SurveyButton source={source} />
				{access.entries.r2 !== 'open' && <UpgradeButton source={source} label="See plans" />}
			</div>
		</Card>
	);
}
