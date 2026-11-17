/**
 * Atlas renamed its three top sectors (handover v1, C2): Activity & Performance → Athlete Tech,
 * Fans & Content → Fan Tech, Management & Organisation → Executive Tech. This report was written
 * with the old names and keys its colours and "For Athletes / For Fans / For Executives" labels on
 * them, so live API data is translated back once, where it enters the report.
 */
const REPORT_SECTOR_KEY: Record<string, string> = {
	'Athlete Tech': 'Activity & Performance',
	'Fan Tech': 'Fans & Content',
	'Executive Tech': 'Management & Organisation',
};

/** Deep copy with the new top-sector names (as values or keys) replaced by the report's keys. */
export function toReportSectorKeys<T>(v: T): T {
	if (typeof v === 'string') return (REPORT_SECTOR_KEY[v] ?? v) as T;
	if (Array.isArray(v)) return v.map(toReportSectorKeys) as T;
	if (v && typeof v === 'object') {
		return Object.fromEntries(Object.entries(v as Record<string, unknown>).map(([k, x]) => [REPORT_SECTOR_KEY[k] ?? k, toReportSectorKeys(x)])) as T;
	}
	return v;
}
