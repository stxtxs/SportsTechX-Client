/**
 * Mock answers for the benchmark endpoints, used only with
 * `NEXT_PUBLIC_VC_BENCHMARK_MOCK=1`.
 *
 * Every number here is SYNTHETIC. Real R2/R3 figures must never be bundled
 * into the client (anything imported by a client component reaches every
 * browser), so the fixtures use made-up values that only exercise the layout.
 *
 * Pick a QA scenario with `?benchmark_mock=<name>` on any page (remembered in
 * this browser):
 *
 *   explore           free Explore, not a contributor
 *   trial             contributor in the 30-day Scout trial
 *   after-trial       contributor whose trial ended (back on Explore)
 *   paid              Raise or Scout subscriber, not a contributor
 *
 * With no scenario chosen, the account's own plan decides: `explore` or
 * `paid`, i.e. NOT a contributor. The default used to be `trial`, which made
 * every local account a survey contributor, so "Your benchmark" showed for
 * everyone in local testing (fix list 17 Nov, 1.8).
 *   paid-contributor  subscriber who also took the survey
 *   thin              contributor with under two investments, small peer group
 */
import { EDITION } from './config.ts';
import type { BenchmarkAccess, PersonalBenchmark, ThesisPrefill } from './types.ts';

export const MOCK_SCENARIOS = ['explore', 'trial', 'after-trial', 'paid', 'paid-contributor', 'thin'] as const;
export type MockScenario = (typeof MOCK_SCENARIOS)[number];

const KEY = 'stx-benchmark-mock';

/** The active scenario: URL param first (and remembered), then storage, then the plan's non-contributor default. */
export function mockScenario(tier?: string): MockScenario {
	const byPlan: MockScenario = tier === 'raise' || tier === 'scout' ? 'paid' : 'explore';
	if (typeof window === 'undefined') return byPlan;
	const isScenario = (v: string | null): v is MockScenario => !!v && (MOCK_SCENARIOS as readonly string[]).includes(v);
	try {
		const fromUrl = new URLSearchParams(window.location.search).get('benchmark_mock');
		if (isScenario(fromUrl)) { localStorage.setItem(KEY, fromUrl); return fromUrl; }
		const stored = localStorage.getItem(KEY);
		if (isScenario(stored)) return stored;
	} catch { /* storage blocked: default */ }
	return byPlan;
}

const daysFromNow = (d: number) => new Date(Date.now() + d * 864e5).toISOString();
const isContributor = (s: MockScenario) => s === 'trial' || s === 'after-trial' || s === 'paid-contributor' || s === 'thin';

export function mockAccess(s: MockScenario): BenchmarkAccess {
	const contributor = isContributor(s);
	const inTrial = s === 'trial' || s === 'thin';
	return {
		edition: EDITION,
		// Explore: summary + locked full report. Everyone else (paid, or a
		// contributor after a downgrade — `after-trial`) gets the full report only.
		entries: { r1: s === 'explore' ? 'open' : 'none', r2: s === 'explore' ? 'locked' : 'open', r3: contributor ? 'open' : 'none' },
		contributor: contributor
			? { status: s === 'after-trial' ? 'trial_ended' : 'active', fund_name: s === 'thin' ? null : 'Sample Ventures', respondent_name: 'Alex Sample' }
			: null,
		trial: inTrial
			? { source: 'benchmark_trial', plan: 'scout', started_at: daysFromNow(-3), ends_at: daysFromNow(27), status: 'active' }
			: s === 'after-trial'
				? { source: 'benchmark_trial', plan: 'scout', started_at: daysFromNow(-40), ends_at: daysFromNow(-10), status: 'ended' }
				: null,
	};
}

const CHANNELS = [
	'Warm introductions', 'Outbound', 'Co-investor or portfolio referral', 'Specialist research platform or sector network',
	'Events and conferences', 'Data platforms', 'Direct founder outreach',
];
const SAMPLE_RATINGS = [5, 3, 4, 2, 3, null, 4];

export function mockPersonal(s: MockScenario): PersonalBenchmark {
	const thin = s === 'thin';
	return {
		edition: EDITION,
		baseline_version: 1,
		generated_at: daysFromNow(-1),
		fund_name: thin ? null : 'Sample Ventures',
		respondent_name: 'Alex Sample',
		enough_deal_data: !thin,
		headline: {
			satisfaction: { label: 'Satisfaction with deal flow', yours: 3, baseline: 3.5, n: 30 },
			top_channel: thin ? null : CHANNELS[0],
			outbound_priority: thin ? null : 'moderate',
		},
		deal_sources: thin ? [] : [{ channel: CHANNELS[0], deals: 2 }, { channel: CHANNELS[2], deals: 1 }],
		channel_ratings: CHANNELS.map((label, i) => ({ label, yours: SAMPLE_RATINGS[i], baseline: 3, n: 20 })),
		outbound: thin ? null : {
			rating: { label: 'Outbound rating', yours: 3, baseline: 3.5, n: 20 },
			baseline_priority: { high: 10, moderate: 10, not_a_priority: 10 },
		},
		tooling: thin ? null : { platforms: ['Sample data platform'], fit: { label: 'Data platform fit', yours: 2, baseline: 3, n: 10 } },
		challenges: thin ? [] : ['Too much low-quality inbound', 'Hard to reach founders early'],
		dissatisfaction_reasons: thin ? [] : ['Not enough relevant companies'],
		peer_group: thin
			? { label: 'Funds over $250M', funds: 3, comparisons: [] }
			: {
				label: 'Funds under $25M', funds: 10, comparisons: [
					{ label: 'Satisfaction with deal flow', yours: 3, baseline: 3.2, n: 10 },
					{ label: 'Warm introductions rating', yours: 5, baseline: 4, n: 10 },
				],
			},
		full_sample: {
			funds: 30, comparisons: [
				{ label: 'Satisfaction with deal flow', yours: 3, baseline: 3.5, n: 30 },
				{ label: 'Warm introductions rating', yours: 5, baseline: 4, n: 30 },
			],
		},
		next_steps: thin ? [] : [
			{ gap: 'You rate data platforms below the sample.', route: 'companies', label: 'Search companies' },
			{ gap: 'Outbound sits below your peers.', route: 'recommended', label: 'Open Recommended' },
			{ gap: 'Few of your deals came from funding activity.', route: 'recently-funded', label: 'See Recently Funded' },
		],
	};
}

export function mockPrefill(s: MockScenario): ThesisPrefill | null {
	if (!isContributor(s)) return null;
	return { source: 'survey', stages: ['Seed Round', 'Series A'], regions: ['Europe'], sub_sectors: [], applied_at: daysFromNow(-3) };
}
