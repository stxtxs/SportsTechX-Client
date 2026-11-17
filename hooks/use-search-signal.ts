'use client';

import { useEffect, useRef } from 'react';
import { apiRequest } from '@/lib/query-client';
import { useDebouncedValue } from './use-debounced-value';

/**
 * Feeds catalog searches into the behavioural personalization profile — the
 * same pipeline chat prompts already use (`POST /api/personalization/signal`,
 * `kind:'search'`). A background LLM pass later turns accumulated signals into
 * inferred sector/sport/region interests (see `user-personalization`).
 *
 * Fire-and-forget: debounced ~2s so a term is captured once the user pauses
 * (not per keystroke), deduped so holding a query doesn't re-send it, and
 * best-effort so a failed signal never affects the search itself. Terms under
 * three characters are ignored (half-typed words are noise for the interest profile).
 */
export function useSearchSignal(query: string | undefined): void {
	const debounced = useDebouncedValue((query ?? '').trim(), 2000);
	const lastSent = useRef('');
	useEffect(() => {
		if (debounced.length < 3 || debounced === lastSent.current) return;
		lastSent.current = debounced;
		void apiRequest('POST', '/api/personalization/signal', { kind: 'search', text: debounced.slice(0, 600) })
			.catch(() => { /* best-effort; the search must never depend on this */ });
	}, [debounced]);
}
