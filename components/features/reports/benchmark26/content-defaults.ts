import reportJson from "./data/public-report.json";

/** The benchmark's editable blocks and their published defaults (the STX JSON, verbatim). */
/** The blocks in their published order (the admin's Page order reorders them). */
export const BENCHMARK26_PART_ORDER = ['why-now', 'deal-sourcing-reality', 'sourcing-process', 'outbound-and-tools', 'closing', 'method'];

export const BENCHMARK26_DEFAULTS: Record<string, unknown> = { ...(reportJson as Record<string, unknown>), partOrder: BENCHMARK26_PART_ORDER };
