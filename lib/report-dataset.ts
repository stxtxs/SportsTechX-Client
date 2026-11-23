import { useEffect } from 'react';
import useSWR, { unstable_serialize, useSWRConfig } from 'swr';
import { apiRequest } from '@/lib/query-client';

const urlOf = (slug: string, key: string) => `/api/reports/${encodeURIComponent(slug)}/data/${encodeURIComponent(key)}`;

/**
 * A report's frozen chart / map data (report_datasets), one key at a time:
 * GET /api/reports/:slug/data/:key → { data }. Served by the API, never bundled.
 * A dataset of a block the reader's plan doesn't open answers 403 (TIER_LOCKED) —
 * the template shows that block as locked, so this only ever loads what is shown.
 * Pass `key = null` to skip (e.g. a filter not chosen yet).
 */
export function useReportDataset<T = unknown>(slug: string, key: string | null) {
	const res = useSWR<{ data: T }>(key ? [urlOf(slug, key)] : null, {
		revalidateOnFocus: false,
		keepPreviousData: true,
	});
	return { data: res.data?.data, isLoading: res.isLoading, error: res.error as unknown };
}

/**
 * Once the page has settled, load the report's other datasets (the ones this reader may open)
 * into the cache one by one, so switching a chart filter is instant — as when the data was
 * bundled. Best-effort: a failure just means that filter loads on demand.
 */
export function usePrefetchReportDatasets(slug: string, enabled: boolean) {
	const { cache, mutate } = useSWRConfig();
	useEffect(() => {
		if (!enabled) return;
		let stop = false;
		const t = setTimeout(() => void (async () => {
			try {
				const r = await apiRequest('GET', `/api/reports/${encodeURIComponent(slug)}/data`);
				if (!r.ok) return;
				const { keys } = (await r.json()) as { keys: string[] };
				for (const key of keys) {
					if (stop) return;
					const k = [urlOf(slug, key)];
					if (cache.get(unstable_serialize(k))?.data) continue; // already loaded
					try {
						const d = await apiRequest('GET', k[0]);
						await mutate(k, await d.json(), { revalidate: false });
					} catch { /* this one loads on demand */ }
				}
			} catch { /* on-demand loading still works */ }
		})(), 2500);
		return () => { stop = true; clearTimeout(t); };
	}, [slug, enabled, cache, mutate]);
}
