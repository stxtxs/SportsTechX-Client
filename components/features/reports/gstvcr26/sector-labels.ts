/**
 * Display names for the three sector groups in GSTVCR26 (Nov 2026 rename):
 *   For Fans → Fan Tech, For Athletes → Athlete Tech, For Executives → Executive Tech.
 *
 * Front end only. The backend and the saved report content can still carry the
 * old names, so `renameSectorLabels` is applied to the saved content as it is
 * read (see report-gstvcr26.tsx) and every hard-coded label in this folder uses
 * the new names directly.
 */

export const SECTOR_LABEL = {
  athletes: 'Athlete Tech',
  fans: 'Fan Tech',
  execs: 'Executive Tech',
} as const;

const RENAMES: ReadonlyArray<readonly [RegExp, string]> = [
  [/\bFor Fans\b/g, SECTOR_LABEL.fans],
  [/\bFor Athletes\b/g, SECTOR_LABEL.athletes],
  [/\bFor Executives\b/g, SECTOR_LABEL.execs],
  [/\bFOR FANS\b/g, SECTOR_LABEL.fans.toUpperCase()],
  [/\bFOR ATHLETES\b/g, SECTOR_LABEL.athletes.toUpperCase()],
  [/\bFOR EXECUTIVES\b/g, SECTOR_LABEL.execs.toUpperCase()],
];

/** One string with the old sector names replaced. */
export function renameSectorText(text: string): string {
  return RENAMES.reduce((out, [pattern, label]) => out.replace(pattern, label), text);
}

/**
 * A copy of `value` with the old sector names replaced in every string, at any
 * depth (object keys included, so maps keyed by label keep working). Never
 * mutates the input.
 */
export function renameSectorLabels<T>(value: T): T {
  if (typeof value === 'string') return renameSectorText(value) as T;
  if (Array.isArray(value)) return value.map((item) => renameSectorLabels(item)) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [
        renameSectorText(key),
        renameSectorLabels(item),
      ]),
    ) as T;
  }
  return value;
}
