/**
 * VC Deal Sourcing Benchmark 2026 on Atlas — constants and feature flags.
 *
 * Three report entries, each its own record so each can be gated on its own:
 *
 *   R1 Summary  — any signed-in user
 *   R2 Full     — Raise or Scout plan, or an email on the R2 allowlist
 *   R3 Personal — the contributor's verified email only
 *
 * Spec: Notion › ATLAS › "VC Benchmark release: developer spec". Backend work
 * the client is waiting on: Notion › ATLAS › "VC Benchmark: backend and
 * Supabase requirements".
 *
 * Plain module (no React), so the `.check.ts` files can import it under node.
 */

/** The only edition so far. Allowlist rows and pins are edition-scoped. */
export const EDITION = 2026;

export type BenchmarkEntry = 'r1' | 'r2' | 'r3';

/** Report slugs. R2 is the existing `reports` row; R1 and R3 are new records. */
export const SLUG: Record<BenchmarkEntry, string> = {
	r1: 'investors-survey26-summary',
	r2: 'investors-survey26',
	r3: 'investors-survey26-yours',
};

export const ENTRY_PATH: Record<BenchmarkEntry, string> = {
	r1: `/reports/${SLUG.r1}`,
	r2: `/reports/${SLUG.r2}`,
	r3: `/reports/${SLUG.r3}`,
};

export const ENTRY_TITLE: Record<BenchmarkEntry, string> = {
	r1: 'VC Deal Sourcing Benchmark 2026: Summary',
	r2: 'VC Deal Sourcing Benchmark 2026',
	r3: 'Your benchmark',
};

/** The Football Tech & Business Report 2026, pinned beside the benchmark. */
export const FTR_SLUG = 'ftabr26';

/** Peer-group comparisons need at least this many funds, else use the full sample. */
export const PEER_GROUP_MIN = 5;

/** Home pin row holds at most this many cards. */
export const MAX_PINS = 3;

/** `featured_until` default: six weeks from release, configurable 4–6. */
export const FEATURED_WEEKS = { default: 6, min: 4, max: 6 } as const;

/** Where an upgrade goes: the public pricing page. */
export const UPGRADE_PATH = '/solutions';

/** Hover text on the locked full report. */
export const LOCKED_HINT = 'Unlocked with Raise or Scout';

/**
 * Build-time flags (NEXT_PUBLIC_*), for local work only. The switches people use - benchmark
 * on/off, survey link, release date - are site settings in Admin > System settings, read at
 * runtime by `useBenchmarkSettings()` (settings.ts), so no redeploy is needed.
 *
 *  - `NEXT_PUBLIC_VC_BENCHMARK_MOCK=1`  answer the benchmark endpoints from `mock.ts` and force
 *                                       the benchmark on (local QA; never in production).
 *  - `NEXT_PUBLIC_WALKTHROUGH=1`        first-login walkthrough + banner (paused, see below).
 */
const on = (v: string | undefined) => v === '1' || v === 'true';
/** The first-login tour is off until it is rewritten (see FLAGS.walkthrough). */
const TOUR_PAUSED = true;
export const FLAGS = {
	mock: on(process.env.NEXT_PUBLIC_VC_BENCHMARK_MOCK),
	// Paused on every environment until the tour is rewritten (fix list
	// 17 Nov, 1.1): its copy names pages that no longer exist. Off here, not in
	// .env, so preview and production cannot switch it back on by accident.
	// This turns off the automatic tour, the "New on Atlas" banner and the
	// account menu's "Take the tour". Delete `TOUR_PAUSED &&` to restore.
	walkthrough: !TOUR_PAUSED && on(process.env.NEXT_PUBLIC_WALKTHROUGH),
} as const;

/** Which source answers the benchmark endpoints: the mock locally, else the live API. */
export const SOURCE: 'mock' | 'api' = FLAGS.mock ? 'mock' : 'api';
