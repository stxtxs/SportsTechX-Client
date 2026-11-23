import useSWR from 'swr';

/**
 * A report's frozen chart / map data (report_datasets), one key at a time:
 * GET /api/reports/:slug/data/:key → { data }. Served by the API, never bundled.
 * A dataset of a block the reader's plan doesn't open answers 403 (TIER_LOCKED) —
 * the template shows that block as locked, so this only ever loads what is shown.
 * Pass `key = null` to skip (e.g. a filter not chosen yet).
 */
export function useReportDataset<T = unknown>(slug: string, key: string | null) {
	const res = useSWR<{ data: T }>(key ? [`/api/reports/${encodeURIComponent(slug)}/data/${encodeURIComponent(key)}`] : null, {
		revalidateOnFocus: false,
		keepPreviousData: true,
	});
	return { data: res.data?.data, isLoading: res.isLoading, error: res.error as unknown };
}
