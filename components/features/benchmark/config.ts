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

/** Release date of the 2026 edition on Atlas (drives the default `featured_until`). */
export const RELEASE_DATE = process.env.NEXT_PUBLIC_VC_BENCHMARK_RELEASE ?? '2026-11-23';

/**
 * Where the survey lives. Open product question: Fillout or Zite. Unset hides
 * the investor call to action rather than linking nowhere.
 */
export const SURVEY_URL = process.env.NEXT_PUBLIC_VC_BENCHMARK_SURVEY_URL ?? '';

/** Where an upgrade goes: the public pricing page. */
export const UPGRADE_PATH = '/solutions';

/**
 * Feature flags. Read at build time (NEXT_PUBLIC_*), so each environment opts in.
 *
 *  - `NEXT_PUBLIC_VC_BENCHMARK=1`       R1 and R3 entries, R2 gate, library
 *                                       badges, Home pins, persona CTA.
 *  - `NEXT_PUBLIC_VC_BENCHMARK_API=1`   the backend endpoints are live: call
 *                                       them. Turn on once the backend ships.
 *  - `NEXT_PUBLIC_VC_BENCHMARK_MOCK=1`  answer the not-yet-built endpoints
 *                                       from `mock.ts` instead (wins over API).
 *  - `NEXT_PUBLIC_WALKTHROUGH=1`        first-login walkthrough + banner.
 *
 * With neither API nor MOCK, no new endpoint is called: access falls back to
 * plan only (`fallbackAccess`), R3 stays hidden and pins live in the browser.
 * With the main flag off, R2 keeps today's behaviour (open to every signed-in
 * user) and nothing else changes.
 */
const on = (v: string | undefined) => v === '1' || v === 'true';
/** The first-login tour is off until it is rewritten (see FLAGS.walkthrough). */
const TOUR_PAUSED = true;
export const FLAGS = {
	benchmark: on(process.env.NEXT_PUBLIC_VC_BENCHMARK),
	mock: on(process.env.NEXT_PUBLIC_VC_BENCHMARK_MOCK),
	api: on(process.env.NEXT_PUBLIC_VC_BENCHMARK_API),
	// Paused on every environment until the tour is rewritten (fix list
	// 17 Nov, 1.1): its copy names pages that no longer exist. Off here, not in
	// .env, so preview and production cannot switch it back on by accident.
	// This turns off the automatic tour, the "New on Atlas" banner and the
	// account menu's "Take the tour". Delete `TOUR_PAUSED &&` to restore.
	walkthrough: !TOUR_PAUSED && on(process.env.NEXT_PUBLIC_WALKTHROUGH),
} as const;

/** Which source answers the new endpoints. */
export const SOURCE: 'mock' | 'api' | 'none' = FLAGS.mock ? 'mock' : FLAGS.api ? 'api' : 'none';
