/**
 * The benchmark's page order. The report document itself (meta, intro,
 * sections, closing, methodology) lives ONLY in reports.content for slug
 * `investors-survey26`, served by the API after its entitlement check.
 *
 * It used to be bundled here as data/public-report.json, which shipped the
 * full report (R2) to every browser. Removed deliberately — do not re-add a
 * bundled copy; the published JSON is in git history if the record ever
 * needs re-seeding.
 */
export const BENCHMARK26_PART_ORDER = ['why-now', 'deal-sourcing-reality', 'sourcing-process', 'outbound-and-tools', 'closing', 'method'];

export const BENCHMARK26_DEFAULTS: Record<string, unknown> = { partOrder: BENCHMARK26_PART_ORDER };
