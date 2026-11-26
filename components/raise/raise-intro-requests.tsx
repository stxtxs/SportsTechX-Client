'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Badge, Button } from '@/components/atlas';
import { apiRequest } from '@/lib/query-client';
import { fmtFullDate } from '@/lib/format';

/**
 * Introduction requests for the founder's raise (Deal Flow 2.3 step 3, 11.5). Only requests
 * SportsTechX has passed on appear here. Accept: Atlas emails both of you, copying SportsTechX.
 * Decline: the investor sees "Not right now", with no reason given.
 */
interface Req {
	id: string; status: string; note: string | null; company_name: string | null;
	sent_to_founder_at: string | null; decided_at: string | null;
	scout_name: string | null; scout_org: string | null; scout_verified: boolean;
}
const KEY = '/api/raise/intros';
const DONE: Record<string, string> = { connected: 'Introduced', declined: 'Declined', no_response: 'Closed, no answer' };

export function RaiseIntroRequests() {
	const { data, mutate } = useSWR<{ data: Req[] }>(KEY);
	const [busy, setBusy] = useState<string | null>(null);
	const rows = data?.data ?? [];

	const decide = async (r: Req, decision: 'accept' | 'decline') => {
		setBusy(r.id);
		try {
			await apiRequest('POST', `${KEY}/${r.id}/decision`, { decision });
			toast.success(decision === 'accept' ? 'Accepted. Atlas is introducing you by email.' : 'Declined.');
			await mutate();
		} catch (e) { toast.error((e as Error).message); }
		finally { setBusy(null); }
	};

	if (!data) return null;
	return (
		<div id="raise-intros" style={{ display: 'grid', gap: 12 }}>
			{rows.length === 0 ? (
				<p style={{ fontSize: 13, color: 'var(--a-muted)', margin: 0 }}>
					No introduction requests yet. When an investor asks to meet you through Deal Flow and SportsTechX approves it, it shows here.
				</p>
			) : rows.map((r) => (
				<div key={r.id} style={{ borderTop: '1px solid var(--a-line)', paddingTop: 12, display: 'grid', gap: 6 }}>
					<div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
						<strong style={{ fontSize: 14 }}>{r.scout_name ?? 'An investor'}{r.scout_org ? ` · ${r.scout_org}` : ''}</strong>
						{r.scout_verified && <Badge>Verified investor</Badge>}
						<span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--a-muted)' }}>{r.sent_to_founder_at ? fmtFullDate(r.sent_to_founder_at) : ''}</span>
					</div>
					{r.note && <p style={{ fontSize: 13, margin: 0, color: 'var(--a-ink)' }}>{r.note}</p>}
					{r.status === 'shared' ? (
						<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
							<Button size="sm" disabled={busy === r.id} onClick={() => void decide(r, 'accept')}>Accept introduction</Button>
							<Button size="sm" variant="outline" disabled={busy === r.id} onClick={() => void decide(r, 'decline')}>Decline</Button>
							<span style={{ fontSize: 12, color: 'var(--a-muted)' }}>No contact details are shared before you accept.</span>
						</div>
					) : (
						<span style={{ fontSize: 12, color: 'var(--a-muted)' }}>{DONE[r.status] ?? r.status}{r.decided_at ? ` · ${fmtFullDate(r.decided_at)}` : ''}</span>
					)}
				</div>
			))}
		</div>
	);
}
