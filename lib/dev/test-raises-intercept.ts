/**
 * Serves the test raises (`test-raises.ts`) to Deal Flow on local only.
 *
 * On only when NEXT_PUBLIC_TEST_RAISES=1 (set in `.env.local`, never on
 * Vercel) AND the page is on localhost, so it can't show on preview or live
 * even if the variable leaks. The fixture is loaded with a dynamic import from
 * here, so builds without the variable never fetch it.
 *
 * - List (`/api/scout/dealflow?tab=…`): the test raises join the real rows.
 * - One raise (`/api/scout/dealflow/<test id>`): answered here, no request.
 * - Watch, Request introduction and documents on a test raise: answered here
 *   with a success, nothing sent, so no founder is emailed and no task is made.
 */
import type { DealRow } from '../../components/scout/deal-types.ts';

const LIST = '/api/scout/dealflow';

export function testRaisesOn(): boolean {
	if (process.env.NEXT_PUBLIC_TEST_RAISES !== '1' || typeof window === 'undefined') return false;
	return /^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname);
}

// What the reviewer did to a test raise in this browser tab: watched, asked for an intro.
const watched = new Set<string>();
const asked = new Set<string>();

const parse = (url: string) => new URL(url, window.location.origin);
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

async function fixture() {
	return import('./test-raises.ts');
}

const withState = (r: DealRow): DealRow => ({
	...r,
	is_watched: watched.has(r.id),
	interest_status: asked.has(r.id) ? 'received' : null,
});

/** SWR reads: a test raise by id, answered here. Null means "not mine, fetch it". */
export async function readTestRaise(url: string): Promise<{ data: unknown } | null> {
	const u = parse(url);
	const m = /^\/api\/scout\/dealflow\/([0-9a-f-]{36})$/i.exec(u.pathname);
	if (!m) return null;
	const { TEST_RAISES, isTestRaiseId } = await fixture();
	if (!isTestRaiseId(m[1]!)) return null;
	const row = TEST_RAISES.find((r) => r.id === m[1]);
	return row ? { data: withState(row) } : null;
}

/** SWR reads: the real list for a tab, with the test raises first. */
export async function mergeTestRaises(url: string, data: unknown): Promise<unknown> {
	const u = parse(url);
	if (u.pathname !== LIST) return data;
	const { testRaisesFor } = await fixture();
	const real = (data as { data?: DealRow[] } | null)?.data ?? [];
	const tab = u.searchParams.get('tab') ?? undefined;
	const tests = testRaisesFor(tab).map(withState);
	// Featured first, as the API orders them.
	const rows = [...tests.filter((r) => r.is_featured), ...real.filter((r) => r.is_featured), ...tests.filter((r) => !r.is_featured), ...real.filter((r) => !r.is_featured)];
	return { ...(data as object | null ?? {}), data: rows };
}

/** Writes and document links for a test raise: answered here, nothing sent. Null means "not mine". */
export async function answerTestRaise(method: string, url: string): Promise<Response | null> {
	const u = parse(url);
	const m = /^\/api\/scout\/dealflow\/([0-9a-f-]{36})(?:\/([a-z-]+))?$/i.exec(u.pathname);
	if (!m) return null;
	const { isTestRaiseId } = await fixture();
	const id = m[1]!;
	if (!isTestRaiseId(id)) return null;
	const action = m[2];
	if (action === 'watch') {
		if (method === 'DELETE') watched.delete(id); else watched.add(id);
		return json({ ok: true });
	}
	if (action === 'interest') { asked.add(id); return json({ status: 'received' }); }
	if (action === 'deck-url' || action === 'one-pager-url') return json({ url: 'https://example.com' });
	if (!action && method === 'GET') {
		const row = await readTestRaise(url);
		return row ? json(row.data) : null;
	}
	return json({ ok: true });
}
