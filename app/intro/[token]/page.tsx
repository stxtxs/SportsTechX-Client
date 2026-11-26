'use client';

import { use, useState } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/atlas';

/**
 * `/intro/[token]`: the page a founder's email opens (Deal Flow 2.3 step 3). Public, no sign-in:
 * the founder of a raise shared in Boardroom may have no Atlas account. The link's token is the
 * key. The email's Accept / Decline only preselect; nothing changes until the founder confirms
 * here, so a mail scanner opening the link can't decide for them.
 */
interface Req {
	status: string; company_name: string | null; scout_name: string | null; scout_org: string | null;
	scout_type: string | null; scout_verified: boolean; note: string | null;
}
const fetcher = async (url: string): Promise<Req> => {
	const r = await fetch(url);
	if (!r.ok) throw new Error(String(r.status));
	return (await r.json()) as Req;
};
const CLOSED: Record<string, string> = {
	connected: 'You accepted this introduction. Atlas has introduced you both by email.',
	declined: 'This request was declined. The investor sees "Not right now", with no reason given.',
	no_response: 'This request closed after 7 working days without an answer.',
};

export default function IntroDecisionPage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ decision?: string }> }) {
	const { token } = use(params);
	const { decision } = use(searchParams);
	const url = `/api/public/raise-intros/${encodeURIComponent(token)}`;
	const { data, error, mutate } = useSWR<Req>(url, fetcher, { shouldRetryOnError: false, revalidateOnFocus: false });
	const [choice, setChoice] = useState<'accept' | 'decline' | null>(decision === 'accept' || decision === 'decline' ? decision : null);
	const [busy, setBusy] = useState(false);
	const [failed, setFailed] = useState<string | null>(null);

	const confirm = async (decision: 'accept' | 'decline') => {
		setBusy(true); setFailed(null);
		try {
			const r = await fetch(`${url}/decision`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ decision }) });
			if (!r.ok) throw new Error(r.status === 409 ? 'This request has already been answered.' : 'Something went wrong. Please try again.');
			await mutate();
		} catch (e) { setFailed((e as Error).message); }
		finally { setBusy(false); }
	};

	const who = data ? `${data.scout_name ?? 'An investor'}${data.scout_org ? ` from ${data.scout_org}` : ''}` : '';
	return (
		<main style={{ minHeight: '100dvh', background: 'var(--a-bg, #f5f5f5)', padding: '48px 16px' }}>
			<div style={{ maxWidth: 560, margin: '0 auto', background: 'var(--a-card, #fff)', border: '1px solid var(--a-line, #e5e5e5)', borderRadius: 16, padding: 'clamp(20px, 5vw, 32px)', display: 'grid', gap: 16 }}>
				<div style={{ fontSize: 13, color: 'var(--a-muted, #595959)' }}>Atlas by SportsTechX</div>
				{error ? (
					<>
						<h1 style={{ fontSize: 24, margin: 0 }}>This link is no longer valid</h1>
						<p style={{ margin: 0, color: 'var(--a-muted, #595959)' }}>Check the latest email from Atlas, or sign in to Atlas Raise to see your introduction requests in Settings.</p>
					</>
				) : !data ? <p style={{ margin: 0 }}>Loading…</p> : (
					<>
						<h1 style={{ fontSize: 24, margin: 0 }}>{who} would like an introduction{data.company_name ? ` to ${data.company_name}` : ''}</h1>
						<p style={{ margin: 0, color: 'var(--a-muted, #595959)' }}>
							{[data.scout_type, data.scout_verified ? 'Verified by SportsTechX' : 'Not yet verified by SportsTechX'].filter(Boolean).join(' · ')}
						</p>
						{data.note && <blockquote style={{ margin: 0, padding: '12px 14px', borderLeft: '3px solid var(--a-navy, #1C4C78)', background: 'var(--a-bg, #f5f5f5)' }}>{data.note}</blockquote>}
						{data.status !== 'shared' ? (
							<p style={{ margin: 0, fontWeight: 600 }}>{CLOSED[data.status] ?? 'This request has already been answered.'}</p>
						) : choice ? (
							<>
								<p style={{ margin: 0 }}>
									{choice === 'accept'
										? `Accept? Atlas sends one email to you and ${data.scout_name ?? 'the investor'}, copying SportsTechX, so you can take it from there.`
										: 'Decline? The investor sees "Not right now", with no reason given.'}
								</p>
								<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									<Button disabled={busy} variant={choice === 'accept' ? 'primary' : 'danger'} onClick={() => void confirm(choice)}>
										{busy ? 'Saving…' : choice === 'accept' ? 'Accept introduction' : 'Decline'}
									</Button>
									<Button variant="ghost" disabled={busy} onClick={() => setChoice(null)}>Back</Button>
								</div>
							</>
						) : (
							<>
								<p style={{ margin: 0 }}>No contact details are shared before you accept.</p>
								<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
									<Button onClick={() => setChoice('accept')}>Accept introduction</Button>
									<Button variant="outline" onClick={() => setChoice('decline')}>Decline</Button>
								</div>
							</>
						)}
						{failed && <p role="alert" style={{ margin: 0, color: 'var(--a-danger, #c33)' }}>{failed}</p>}
					</>
				)}
			</div>
		</main>
	);
}
