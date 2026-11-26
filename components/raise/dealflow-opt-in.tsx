'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Check, Users } from 'lucide-react';
import { Badge, Button } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { refreshRaise } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import { openRaiseSetup } from '@/lib/setup-events';
import { fmtFullDate } from '@/lib/format';

/**
 * List my raise in Verified Raises (Deal Flow section 11), in Raise settings.
 *
 * One status line: Draft · Submitted · Changes requested · Live · Closed, with SportsTechX's note
 * and the fields it flagged (11.5). To submit, every required field (11.3) must be filled; the
 * founder confirms the details are accurate and may be shown to Scout users, and chooses whether
 * the company is named. Submitting never publishes: SportsTechX checks it first.
 */
interface State {
	has_raise: boolean;
	status: 'draft' | 'pending' | 'reviewing' | 'live' | 'changes_requested' | 'closed' | null;
	review_notes: string | null;
	review_fields: string[];
	missing: string[];
	submitted_at: string | null;
	company_anonymous: boolean;
}

/** Keys match the server's required fields (11.3). */
const REQUIRED: [string, string][] = [
	['company', 'Company'], ['description', 'One-line description'], ['sector', 'Sector'], ['hq', 'HQ'], ['round', 'Round'],
	['target', 'Target amount and currency'], ['committed', 'Committed so far'], ['instrument', 'Instrument'],
	['close_date', 'Target close date'], ['lead', 'Lead status'], ['deck', 'Pitch deck'], ['contact', 'Contact person'],
];
const label = (k: string) => REQUIRED.find(([key]) => key === k)?.[1] ?? k;

const STATUS: Record<string, { text: string; tone: 'neutral' | 'ok' | 'warn' | 'danger' }> = {
	draft: { text: 'Draft', tone: 'neutral' },
	pending: { text: 'Submitted', tone: 'neutral' },
	reviewing: { text: 'Submitted', tone: 'neutral' },
	changes_requested: { text: 'Changes requested', tone: 'warn' },
	live: { text: 'Live in Verified Raises', tone: 'ok' },
	closed: { text: 'Closed', tone: 'neutral' },
};

const BODY: React.CSSProperties = { fontSize: 13, lineHeight: 1.6, color: 'var(--a-muted)', margin: 0 };
const LINK: React.CSSProperties = {
	background: 'none', border: 'none', padding: 0, cursor: 'pointer',
	font: 'inherit', color: 'var(--a-ink)', textDecoration: 'underline', textUnderlineOffset: 3,
};

export function DealflowOptIn() {
	const { data, isLoading, mutate } = useSWR<State>(qk.raise.dealflow());
	const [busy, setBusy] = useState(false);
	const [confirmed, setConfirmed] = useState(false);
	const [anonymous, setAnonymous] = useState<boolean | null>(null);

	if (isLoading || !data) return <p style={BODY}>Loading…</p>;
	if (!data.has_raise) {
		return (
			<p style={BODY}>
				Set up your raise first, then you can list it in Verified Raises from here.{' '}
				<button type="button" onClick={() => openRaiseSetup()} style={LINK}>Set up your raise</button>
			</p>
		);
	}

	const status = data.status;
	const inReview = status === 'pending' || status === 'reviewing';
	const live = status === 'live';
	const canSubmit = !inReview && !live;
	const hideName = anonymous ?? data.company_anonymous;

	const submit = async () => {
		setBusy(true);
		try {
			await apiRequest('POST', '/api/raise/dealflow/opt-in', { confirm: true, company_anonymous: hideName });
			toast.success('Submitted. SportsTechX checks it within 2 working days.');
			setConfirmed(false);
			await mutate(); void refreshRaise();
		} catch (e) { toast.error((e as Error).message || 'That did not go through. Please try again.'); }
		finally { setBusy(false); }
	};
	const withdraw = async () => {
		setBusy(true);
		try {
			await apiRequest('DELETE', '/api/raise/dealflow/opt-in');
			toast.success('Taken out of Verified Raises.');
			await mutate(); void refreshRaise();
		} catch { toast.error('That did not go through. Please try again.'); }
		finally { setBusy(false); }
	};

	return (
		<div style={{ display: 'grid', gap: 12 }}>
			<div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
				<Users size={14} aria-hidden="true" style={{ color: 'var(--a-muted)' }} />
				{status ? <Badge tone={STATUS[status]?.tone ?? 'neutral'}>{STATUS[status]?.text ?? status}</Badge> : <Badge tone="neutral">Not listed</Badge>}
				{data.submitted_at && (inReview || live) && <span style={{ fontSize: 12, color: 'var(--a-muted)' }}>Submitted {fmtFullDate(new Date(data.submitted_at))}</span>}
			</div>

			<p style={BODY}>
				{live ? 'Scout investors can see your raise and ask for an introduction. Introductions run through SportsTechX; your contact details are never shared without your OK. Committed amount, lead status and target close date can change freely; other changes go back to review.'
					: inReview ? 'SportsTechX is checking the details before investors see it, usually within 2 working days. That check is what "Verified" means, so it never goes live automatically.'
					: status === 'changes_requested' ? 'SportsTechX needs a few changes before your raise can go live. Update your raise, then submit it again.'
					: status === 'closed' ? 'Your raise is not listed. You can submit it again whenever it is current.'
					: 'Show your round to the investors in Atlas Verified Raises. SportsTechX checks it first: an eligibility check that the round is real, not an endorsement.'}
			</p>

			{data.review_notes && (status === 'changes_requested' || status === 'closed') && (
				<div style={{ padding: 10, border: '1px solid var(--a-border)', borderRadius: 8, background: 'var(--a-surface-2)' }}>
					<div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--a-muted)', marginBottom: 4 }}>Note from SportsTechX</div>
					<div style={{ fontSize: 13, color: 'var(--a-ink)' }}>{data.review_notes}</div>
				</div>
			)}

			{canSubmit && (
				<>
					{/* Required to go live (11.3): ticked when filled, flagged when SportsTechX asked for a change. */}
					<ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(220px, 100%), 1fr))', gap: '4px 16px' }}>
						{REQUIRED.map(([k, l]) => {
							const missing = data.missing.includes(k);
							const flagged = data.review_fields.includes(k);
							return (
								<li key={k} style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center', color: missing || flagged ? 'var(--a-ink)' : 'var(--a-muted)' }}>
									<span aria-hidden="true" style={{ width: 14, display: 'inline-flex' }}>{missing ? '○' : <Check size={13} />}</span>
									{l}{missing ? ' (missing)' : flagged ? ' (check this)' : ''}
								</li>
							);
						})}
					</ul>
					{data.missing.length > 0 && (
						<p style={BODY}>
							Add {data.missing.map(label).join(', ')} to submit.{' '}
							<button type="button" onClick={() => openRaiseSetup()} style={LINK}>Edit your raise</button>
						</p>
					)}
					<div style={{ display: 'grid', gap: 6 }}>
						<label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--a-ink)' }}>
							<input type="radio" name="vr-name" checked={!hideName} onChange={() => setAnonymous(false)} /> Show the company name to investors
						</label>
						<label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'center', color: 'var(--a-ink)' }}>
							<input type="radio" name="vr-name" checked={hideName} onChange={() => setAnonymous(true)} /> Keep it undisclosed until I accept an introduction
						</label>
					</div>
					<label style={{ fontSize: 13, display: 'flex', gap: 8, alignItems: 'flex-start', color: 'var(--a-ink)' }}>
						<input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} style={{ marginTop: 3 }} />
						The details are accurate, and SportsTechX may show them to Scout users.
					</label>
				</>
			)}

			<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
				{canSubmit ? (
					<Button disabled={busy || !confirmed || data.missing.length > 0} onClick={() => void submit()}>
						{busy ? 'Working…' : status === 'changes_requested' || status === 'closed' ? 'Submit again' : 'List my raise in Verified Raises'}
					</Button>
				) : (
					<Button variant="outline" disabled={busy} onClick={() => void withdraw()}>{busy ? 'Working…' : 'Withdraw'}</Button>
				)}
			</div>
		</div>
	);
}
