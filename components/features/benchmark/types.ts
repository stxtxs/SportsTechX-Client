/**
 * Wire shapes for the benchmark endpoints the client expects. None of these
 * endpoints exist yet: with `NEXT_PUBLIC_VC_BENCHMARK_MOCK=1` they are answered
 * by `mock.ts`. The backend requirements page in Notion lists each endpoint
 * with exactly these shapes — change one, change the other.
 */
import type { BenchmarkEntry } from './config.ts';

/** `open` renders; `locked` shows the upgrade screen; `none` hides the entry. */
export type EntryAccess = 'open' | 'locked' | 'none';

export type ContributorStatus =
	| 'pending_review' | 'approved' | 'invited' | 'active' | 'trial_ended' | 'rejected' | 'revoked';

/** GET /api/benchmark/2026/access — computed on the server for the caller. */
export interface BenchmarkAccess {
	edition: number;
	entries: Record<BenchmarkEntry, EntryAccess>;
	/** Present only when the caller's verified email is on the allowlist. */
	contributor: {
		status: ContributorStatus;
		fund_name: string | null;
		respondent_name: string | null;
	} | null;
	/** Present while a benchmark trial is running or after it ended. */
	trial: {
		source: 'benchmark_trial';
		plan: 'scout';
		started_at: string;
		ends_at: string;
		status: 'active' | 'ended';
	} | null;
}

/** R1 content: GET /api/reports/investors-survey26-summary (`content` jsonb). */
export interface SummaryContent {
	title: string;
	subtitle: string;
	/** Exactly three in the design. Null value renders a placeholder. */
	headlines: { label: string; value: string | null; note?: string }[];
	chart: { title: string; basis: string; rows: { label: string; value: number }[] } | null;
	/** ISO month the summary was published, e.g. "2026-11". */
	published: string | null;
}

/** One numeric comparison: the fund's answer against the baseline. */
export interface Compare {
	label: string;
	/** null = N/A, shown as "not used". */
	yours: number | null;
	baseline: number;
	/** Number of baseline funds behind `baseline`. */
	n: number;
}

/** R3 content: GET /api/benchmark/2026/mine — the caller's own snapshot only. */
export interface PersonalBenchmark {
	edition: number;
	baseline_version: number;
	generated_at: string;
	fund_name: string | null;
	respondent_name: string | null;
	/** Under two investments → the deal blocks show "not enough data". */
	enough_deal_data: boolean;
	headline: {
		satisfaction: Compare | null;
		top_channel: string | null;
		outbound_priority: 'high' | 'moderate' | 'not_a_priority' | null;
	};
	/** Traced deals by channel. Counts only — never percentages. */
	deal_sources: { channel: string; deals: number }[];
	/** Q12, N/A excluded from the baseline; `yours: null` = not used. */
	channel_ratings: Compare[];
	/** The fund's own priority is `headline.outbound_priority`; this is the baseline spread. */
	outbound: { rating: Compare | null; baseline_priority: { high: number; moderate: number; not_a_priority: number } } | null;
	/** Only for funds that use a data platform; null hides the block. */
	tooling: { platforms: string[]; fit: Compare | null } | null;
	challenges: string[];
	dissatisfaction_reasons: string[];
	/** Peer group by fund size. `funds` is the group size; under 5 → full sample. */
	peer_group: { label: string; funds: number; comparisons: Compare[] } | null;
	full_sample: { funds: number; comparisons: Compare[] };
	/** Top three gaps, each pointing at a live nav route id. */
	next_steps: { gap: string; route: string; label: string }[];
}

/** One Home pin. GET /api/home/pins. */
export interface HomePin {
	/** Stable key, e.g. `benchmark26:r3`, `report:ftabr26`. */
	key: string;
	entry: BenchmarkEntry | 'ftr';
	slug: string;
	/** ISO date; the card disappears after it. */
	featured_until: string;
	/** false = the user unpinned it. */
	pinned: boolean;
}

export type WalkthroughStatus = 'not_started' | 'started' | 'completed' | 'skipped';

/** GET /api/me/onboarding-tour */
export interface WalkthroughState {
	status: WalkthroughStatus;
	/** True on the session that created the account / first sign-in. */
	first_login: boolean;
	/** R3 return URL stored by the invite link, if any. */
	return_url: string | null;
	/** Banner ids the user dismissed. */
	dismissed_banners: string[];
	updated_at: string | null;
}

/** GET /api/scout/thesis/prefill — written once, only into an empty thesis. */
export interface ThesisPrefill {
	source: 'survey';
	/** Atlas values, already mapped server-side through the config table. */
	stages: string[];
	regions: string[];
	sub_sectors: string[];
	applied_at: string | null;
}
