/**
 * GSTVCR26 · Unicorns: figures derived from ./unicorns-data. Pure functions,
 * so every number on the section is computed from the one list.
 */
import type { Unicorn, UnicornContinent, UnicornSector, UnicornStatus } from "./unicorns-data";

/** A private company whose last priced mark is this old or older is "stale". */
export const STALE_MARK_YEAR = 2022;
/** Moves smaller than this ($B) are left out of the movers chart. */
export const MIN_MOVE_B = 0.5;

export const CONTINENT_ORDER: UnicornContinent[] = ["North America", "Europe", "Asia", "South America"];

export interface Share<K extends string> { key: K; count: number; value: number }
export interface Mover { name: string; domain: string; from: number; to: number; delta: number }

export const sumValue = (rows: Unicorn[]): number => rows.reduce((s, r) => s + r.val2026, 0);

export function shares<K extends string>(rows: Unicorn[], keyOf: (r: Unicorn) => K, keys: readonly K[]): Share<K>[] {
  return keys.map((key) => {
    const hit = rows.filter((r) => keyOf(r) === key);
    return { key, count: hit.length, value: sumValue(hit) };
  });
}

export const bySector = (rows: Unicorn[]): Share<UnicornSector>[] =>
  shares(rows, (r) => r.sector, ["fans", "athletes", "execs"] as const);

export const byStatus = (rows: Unicorn[]): Share<UnicornStatus>[] =>
  shares(rows, (r) => r.status, ["private", "public", "owned"] as const);

export const byModel = (rows: Unicorn[]): Share<Unicorn["model"]>[] =>
  shares(rows, (r) => r.model, ["B2C", "B2B", "B2B2C"] as const);

export const byContinent = (rows: Unicorn[]): Share<UnicornContinent>[] =>
  shares(rows, (r) => r.continent, CONTINENT_ORDER);

/** Private companies still carried at a mark set in STALE_MARK_YEAR or earlier. */
export const staleMarks = (rows: Unicorn[]): Unicorn[] =>
  rows.filter((r) => r.status === "private" && r.markYear <= STALE_MARK_YEAR);

/** Real valuation moves since the 2025 list (corrected 2025 figures excluded), biggest first. */
export function movers(rows: Unicorn[]): Mover[] {
  return rows
    .filter((r) => r.val2025 !== null && !r.prevCorrected)
    .map((r) => ({ name: r.name, domain: r.domain, from: r.val2025 as number, to: r.val2026, delta: Math.round((r.val2026 - (r.val2025 as number)) * 10) / 10 }))
    .filter((m) => Math.abs(m.delta) >= MIN_MOVE_B)
    .sort((a, b) => b.delta - a.delta);
}

export const newEntrants = (rows: Unicorn[]): Unicorn[] => rows.filter((r) => r.val2025 === null);

/** Ranked by 2026 valuation, ties by name. Returns a new array. */
export const ranked = (rows: Unicorn[]): Unicorn[] =>
  [...rows].sort((a, b) => b.val2026 - a.val2026 || a.name.localeCompare(b.name));

export const billions = (b: number): string => `$${b.toFixed(1)}B`;
export const pct = (part: number, whole: number): string => `${whole > 0 ? ((part / whole) * 100).toFixed(1) : "0.0"}%`;
