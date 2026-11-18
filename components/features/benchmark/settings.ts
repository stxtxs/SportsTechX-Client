'use client';

import useSWR from 'swr';
import { FLAGS } from './config';

/**
 * The VC Benchmark switches, from Admin › System settings (`GET /api/site-settings`) — they used to be
 * NEXT_PUBLIC_VC_BENCHMARK* build-time env vars, so flipping them needed a redeploy. Local QA with
 * `NEXT_PUBLIC_VC_BENCHMARK_MOCK=1` always has the benchmark on.
 */
export interface BenchmarkSettings {
	enabled: boolean;
	/** "Take the survey" link; '' hides the button. */
	surveyUrl: string;
	/** Release date, YYYY-MM-DD (default featured window on Home). */
	releaseDate: string;
	isLoading: boolean;
}

const DEFAULT_RELEASE = '2026-11-23';

export function useBenchmarkSettings(): BenchmarkSettings {
	const { data, isLoading } = useSWR<{ vc_benchmark?: { enabled: boolean; survey_url: string | null; release_date: string } }>(
		['/api/site-settings'], { revalidateOnFocus: false, dedupingInterval: 60_000, shouldRetryOnError: false },
	);
	const s = data?.vc_benchmark;
	return {
		enabled: FLAGS.mock || !!s?.enabled,
		surveyUrl: s?.survey_url ?? '',
		releaseDate: s?.release_date ?? DEFAULT_RELEASE,
		isLoading: !FLAGS.mock && isLoading,
	};
}
