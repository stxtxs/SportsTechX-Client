'use client';

import { use, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/atlas';
import '@/components/atlas/styles/tokens.css';

/**
 * `/listing/[token]`: a founder confirms a Verified Raise listing SportsTechX started from their
 * company (Deal Flow section 11). Public, no sign-in: the emailed link is the key. Confirming sends
 * it to SportsTechX's review; nothing is shown to investors before that review accepts it.
 */
interface Listing {
	status: string; company_name: string | null; company_description: string | null; hq_city: string | null; hq_country: string | null;
	round_type: string | null; target_amount: string | null; currency_code: string | null; committed_amount: string | null;
	valuation: string | null; target_close_date: string | null;
}
class HttpError extends Error { constructor(readonly status: number) { super(String(status)); } }
const fetcher = async (url: string): Promise<Listing> => {
	const r = await fetch(url);
	if (!r.ok) throw new HttpError(r.status);
	return (await r.json()) as Listing;
};
/** The founder's own figure in their own currency (no conversion: they are confirming what they typed). */
const money = (v: string | null, cur: string | null) => {
	if (!v || !Number(v)) return null;
	try { return new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD', notation: 'compact', maximumFractionDigits: 2 }).format(Number(v)); }
	catch { return `${v} ${cur ?? ''}`.trim(); }
};
const day = (v: string | null) => (v ? new Date(`${v}T00:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : null);
const ROUND: Record<string, string> = { pre_seed: 'Pre-seed round', seed: 'Seed round', series_a: 'Series A', series_b_plus: 'Series B or later', bridge: 'Bridge', other: 'Other' };
const DONE: Record<string, string> = {
	pending: 'Thanks. SportsTechX is checking the details, usually within 2 working days, and emails you once it is live.',
	reviewing: 'Thanks. SportsTechX is checking the details.',
	live: 'Your raise is live in Verified Raises.',
	closed: 'This listing is closed. Nothing is shown to investors.',
};

export default function ListingConfirmPage({ params }: { params: Promise<{ token: string }> }) {
	const { token } = use(params);
	const url = `/api/public/raise-listings/${encodeURIComponent(token)}`;
	const { data, error, mutate } = useSWR<Listing>(url, fetcher, { shouldRetryOnError: false, revalidateOnFocus: false });
	const [hideName, setHideName] = useState(false);
	const [accurate, setAccurate] = useState(false);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState<string | null>(null);

	const answer = async (decision: 'confirm' | 'decline') => {
		setBusy(true); setFailed(null);
		try {
			const r = await fetch(`${url}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision, company_anonymous: hideName }) });
			if (r.status !== 409 && !r.ok) throw new Error(r.status === 429 ? 'Too many tries. Please wait a little and try again.' : 'Something went wrong. Please try again.');
			await mutate();
		} catch (e) { setFailed((e as Error).message); }
		finally { setBusy(false); }
	};

	const facts: [string, string | null][] = data ? [
		['Company', data.company_name], ['About', data.company_description], ['HQ', [data.hq_city, data.hq_country].filter(Boolean).join(', ') || null],
		['Round', data.round_type ? ROUND[data.round_type] ?? data.round_type : null],
		['Target', money(data.target_amount, data.currency_code)],
		['Committed so far', money(data.committed_amount, data.currency_code)],
		['Valuation', /^\s*[0-9.]+\s*$/.test(data.valuation ?? '') ? money(data.valuation, data.currency_code) : (data.valuation || null)],
		['Target close', day(data.target_close_date)],
	] : [];
	return (
		<main className="atlas" style={{ minHeight: '100dvh', background: 'var(--a-page)', color: 'var(--a-ink)', padding: '48px 16px' }}>
			<div style={{ maxWidth: 600, margin: '0 auto', background: 'var(--a-surface)', border: '1px solid var(--a-card-border)', borderRadius: 16, padding: 'clamp(20px, 5vw, 32px)', display: 'grid', gap: 16 }}>
				<div style={{ fontSize: 13, color: 'var(--a-muted)' }}>Atlas by SportsTechX · Verified Raises</div>
				{error && (error as HttpError).status === 404 ? (
					<>
						<h1 style={{ fontSize: 24, margin: 0 }}>This link is no longer valid</h1>
						<p style={{ margin: 0, color: 'var(--a-muted)' }}>Check the latest email from Atlas, or reply to it and we&rsquo;ll help.</p>
					</>
				) : error ? (
					<>
						<h1 style={{ fontSize: 24, margin: 0 }}>We couldn&rsquo;t load this listing</h1>
						<div><Button variant="outline" onClick={() => void mutate()}>Try again</Button></div>
					</>
				) : !data ? <p style={{ margin: 0 }}>Loading…</p> : (
					<>
						<h1 style={{ fontSize: 24, margin: 0 }}>List {data.company_name ?? 'your'} round in Verified Raises?</h1>
						<p style={{ margin: 0, color: 'var(--a-muted)' }}>SportsTechX prepared this from your company&rsquo;s profile. Scout investors see it only after you confirm and SportsTechX has checked it. Introductions run through SportsTechX; your contact details are never shared without your OK.</p>
						<dl style={{ margin: 0, display: 'grid', gridTemplateColumns: 'minmax(110px, auto) 1fr', gap: '6px 16px', fontSize: 14 }}>
							{facts.map(([k, v]) => (
								<div key={k} style={{ display: 'contents' }}>
									<dt style={{ color: 'var(--a-muted)' }}>{k}</dt>
									<dd style={{ margin: 0 }}>{v ?? <span style={{ color: 'var(--a-muted)' }}>Not given yet</span>}</dd>
								</div>
							))}
						</dl>
						{data.status !== 'draft' ? (
							<p style={{ margin: 0, fontWeight: 600 }}>{DONE[data.status] ?? 'This listing has already been answered.'}</p>
						) : (
							<>
								<div style={{ display: 'grid', gap: 6, fontSize: 14 }}>
									<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" name="name" checked={!hideName} onChange={() => setHideName(false)} /> Show the company name to investors</label>
									<label style={{ display: 'flex', gap: 8, alignItems: 'center' }}><input type="radio" name="name" checked={hideName} onChange={() => setHideName(true)} /> Keep it undisclosed until I accept an introduction</label>
								</div>
								<label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 14 }}>
									<input type="checkbox" checked={accurate} onChange={(e) => setAccurate(e.target.checked)} style={{ marginTop: 4 }} />
									The details are accurate, and SportsTechX may show them to Scout users.
								</label>
								<p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)' }}>Something wrong or missing? Reply to the email and SportsTechX will update it before review.</p>
								<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									<Button disabled={busy || !accurate} onClick={() => void answer('confirm')}>{busy ? 'Saving…' : 'Confirm listing'}</Button>
									<Button variant="ghost" disabled={busy} onClick={() => void answer('decline')}>No thanks</Button>
								</div>
							</>
						)}
						{failed && <p role="alert" style={{ margin: 0, color: 'var(--a-danger)' }}>{failed}</p>}
					</>
				)}
			</div>
		</main>
	);
}
