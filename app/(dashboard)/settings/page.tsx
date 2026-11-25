'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { Pencil } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { refreshRaise } from '@/lib/invalidate';
import { openRaiseSetup } from '@/lib/setup-events';
import { Screen, Card, Button, Loading, Badge } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { AccountTabs, CompletionBadge } from '@/components/features/account/account-tabs';
import { DealflowOptIn } from '@/components/raise/dealflow-opt-in';
import { raisePct } from '@/lib/profile-completion';
import { fmtAmount, fmtFullDate } from '@/lib/format';

/**
 * Atlas Raise — Company & Raise settings. A READ-ONLY summary of the raise
 * profile + investor criteria; editing happens in the same Raise setup wizard
 * used for onboarding ("Edit raise" → `openRaiseSetup({ edit: true })`, which the
 * globally-mounted SetupModalHost opens pre-filled and closes on save). No inline
 * form — one editor, one source of truth.
 *
 * The operational sections below the summary (Investor Circle opt-in, and the
 * raise controls that mark a round funded/paused/closed) are NOT part of the
 * setup wizard, so they stay here as live controls.
 */
type Rec = Record<string, unknown>;

const STAGE_LABEL: Record<string, string> = { setting_up: 'Setting up', preparing: 'Preparing', outreach: 'Outreach underway', in_conversations: 'In conversations', due_diligence: 'In due diligence', closing: 'Closing', funded: 'Funded', paused: 'Paused', closed: 'Closed' };
const ROUND: Record<string, string> = { pre_seed: 'Pre-seed', seed: 'Seed', series_a: 'Series A', series_b_plus: 'Series B+', bridge: 'Bridge', other: 'Other' };
const REVENUE: Record<string, string> = { pre_revenue: 'Pre-revenue', generating: 'Generating revenue' };
const STRUCTURE: Record<string, string> = { equity: 'Priced equity round', safe: 'SAFE', convertible: 'Convertible', undecided: 'Undecided', other: 'Other' };
/**
 * The raise's status actions (fix list 17 Nov, 2.1): "Round closed: funded" and
 * "Pause" while the raise is active; only "Reopen" once it is paused, funded or
 * closed. Each asks first, then shows its new status straight away.
 */
type StatusKey = 'funded' | 'paused' | 'active';
const STATUS_ACTIONS: Record<StatusKey, { button: string; confirm: string; body?: string; ok: string; toast: string }> = {
	funded: { button: 'Round closed: funded', confirm: 'Mark this round as funded?', body: 'This ends the round in Atlas. Your watchlists stay.', ok: 'Mark as funded', toast: 'Round marked as funded.' },
	paused: { button: 'Pause', confirm: 'Pause this raise?', body: 'You can reopen it any time.', ok: 'Pause raise', toast: 'Raise paused.' },
	active: { button: 'Reopen', confirm: 'Reopen this raise?', body: 'Your raise becomes active again.', ok: 'Reopen raise', toast: 'Raise reopened.' },
};
/** Which actions show for a status: an ended or paused raise can only be reopened. */
const actionsFor = (status: string): StatusKey[] => (status === 'paused' || status === 'funded' || status === 'closed' ? ['active'] : ['funded', 'paused']);
const STATUS_LABEL: Record<string, string> = { active: 'Active', open: 'Active', funded: 'Funded', paused: 'Paused', closed: 'Closed' };

const LEAD: Record<string, string> = { lead: 'Prefer lead', followers: 'Prefer followers', both: 'Both' };

const s = (v: unknown): string => (v == null ? '' : String(v));
/** Amounts in the Atlas format (€5.00M), with the currency symbol in front. */
const amt = (v: unknown, cur: string): string => (v == null || v === '' ? '' : fmtAmount(Number(v), cur, ''));
const map = (m: Record<string, string>, v: unknown): string => (v == null || v === '' ? '' : m[String(v)] ?? String(v));

export default function RaiseSettingsPage() {
	const { data, isLoading, mutate } = useSWR<{ raise: Rec | null; criteria: Rec | null }>(qk.raise.current());
	const home = useSWR<{ raise: { stage?: string | null } | null }>(qk.raise.home());
	const [busy, setBusy] = useState(false);
	const [confirming, setConfirming] = useState<StatusKey | null>(null);

	// The new status shows at once (optimistic), then the server's answer
	// replaces it. Before, the request went through but the screen didn't move.
	const setStatus = async (status: StatusKey) => {
		setConfirming(null);
		setBusy(true);
		const before = data;
		if (data?.raise) void mutate({ ...data, raise: { ...data.raise, status } }, { revalidate: false });
		try { await apiRequest('PATCH', '/api/raise', { status }); toast.success(STATUS_ACTIONS[status].toast); }
		catch (e) { if (before) void mutate(before, { revalidate: false }); toast.error((e as Error).message ?? 'Could not update'); }
		finally { void mutate(); void refreshRaise(); setBusy(false); }
	};

	if (isLoading) return <Screen><Loading /></Screen>;

	const r = data?.raise ?? {};
	const c = data?.criteria ?? {};
	const needsSetup = !data?.raise;
	const cur = s(r.currency_code) || 'EUR';
	const category = Array.isArray(r.company_category) ? (r.company_category as string[]).join(' › ') : s(r.company_category);
	const hq = [s(r.hq_city), s(r.hq_country)].filter(Boolean).join(', ');
	const cheque = r_has(c.cheque_min) || r_has(c.cheque_max) ? `${amt(c.cheque_min, cur) || '—'} – ${amt(c.cheque_max, cur) || '—'}` : '';
	const strategic = c.strategic_ok === true ? 'Open to strategics' : c.strategic_ok === false ? 'Financial investors only' : '';
	const excluded = Array.isArray(c.excluded_investor_ids) && c.excluded_investor_ids.length ? `${c.excluded_investor_ids.length} excluded` : '';
	const derivedStage = home.data?.raise?.stage ? (STAGE_LABEL[home.data.raise.stage] ?? home.data.raise.stage) : '—';
	const status = s(r.status) || 'active';
	const statusPill = <Badge tone={status === 'funded' ? 'ok' : status === 'closed' ? 'neutral' : status === 'paused' ? 'neutral' : 'navy'}>{STATUS_LABEL[status] ?? status}</Badge>;

	return (
		<Screen>
			<AccountTabs actions={<><CompletionBadge pct={raisePct(data?.raise, data?.criteria)} />{!needsSetup && <Button size="sm" variant="outline" onClick={() => openRaiseSetup({ edit: true })}><Pencil size={13} /> Edit</Button>}</>} />

			<div style={{ display: 'grid', gap: 18 }}>
				{needsSetup ? (
					<Card>
						<div style={{ textAlign: 'center', padding: '28px 16px', display: 'grid', gap: 12, placeItems: 'center' }}>
							<div style={{ fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>Set up your raise</div>
							<p style={{ margin: 0, maxWidth: 440, fontSize: 13, lineHeight: 1.55, color: 'var(--a-muted)' }}>
								Tell Atlas about your company, your round and the investors you want, and it builds your raise plan, pipeline and matches.
							</p>
							<Button onClick={() => openRaiseSetup()} style={{ marginTop: 4 }}>Set up your raise</Button>
						</div>
					</Card>
				) : (
					<>
						<SummaryCard title={<span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>Company profile {statusPill}</span>} fields={[
							['Company name', s(r.company_name)], ['Website', s(r.company_website)],
							['Headquarters', hq], ['Stage', r.company_stage === 'other' && s(r.company_stage_other) ? s(r.company_stage_other) : map(ROUND, r.company_stage)],
							['Revenue status', map(REVENUE, r.revenue_status)], ['Sector', category],
							['Description', s(r.company_description)],
						]} />
						<SummaryCard title="Your round" fields={[
							['Round type', r.round_type === 'other' && s(r.round_type_other) ? s(r.round_type_other) : map(ROUND, r.round_type)], ['Target raise', amt(r.target_amount, cur)],
							['Target close date', r.target_close_date ? fmtFullDate(s(r.target_close_date).slice(0, 10)) : ''], ['Committed', amt(r.committed_amount, cur)],
							['Valuation', amt(r.valuation, cur)], ['Prior capital raised', amt(r.prior_capital_raised, cur)],
							['Structure', map(STRUCTURE, r.structure)],
						]} />
						<SummaryCard title="Investor criteria" fields={[
							['Investor types', (c.investor_types as string[]) ?? []], ['Geographies', (c.geographies as string[]) ?? []],
							['Cheque size', cheque], ['Lead or follow', map(LEAD, c.lead_preference)],
							['Strategic preference', strategic], ['Excluded investors', excluded],
						]} />
					</>
				)}

				{/* Operational — not part of the setup wizard, so they stay as live controls. */}
				<Section title="Investor Circle">
					<DealflowOptIn />
				</Section>

				{!needsSetup && (
					<Section title="Raise controls">
						<div style={{ fontSize: 12, lineHeight: 1.55, color: 'var(--a-muted)', marginBottom: 4 }}>
							Current stage: <strong style={{ fontFamily: 'var(--a-mono)', fontWeight: 400, fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-ink)' }}>{derivedStage}</strong> · set from your Investor Watchlist activity, not editable here.
						</div>
							<div style={{ fontSize: 12, color: 'var(--a-muted)', display: 'flex', alignItems: 'center', gap: 8 }}>Status: {statusPill}</div>
							<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
								{actionsFor(status).map((k) => (
									<Button key={k} variant={k === 'active' ? 'primary' : 'outline'} disabled={busy} onClick={() => setConfirming(k)}>
										{STATUS_ACTIONS[k].button}
									</Button>
								))}
							</div>
							<Modal
								open={confirming !== null}
								onOpenChange={(o) => { if (!o) setConfirming(null); }}
								title={confirming ? STATUS_ACTIONS[confirming].confirm : ''}
								footer={confirming && <>
									<Button variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
									<Button onClick={() => void setStatus(confirming)}>{STATUS_ACTIONS[confirming].ok}</Button>
								</>}
							>
								{confirming ? STATUS_ACTIONS[confirming].body ?? null : null}
							</Modal>
					</Section>
				)}
			</div>
		</Screen>
	);
}

function r_has(v: unknown): boolean { return v != null && v !== ''; }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<Card>
			<div style={{ fontSize: 16, fontFamily: 'var(--a-font)', fontWeight: 700, color: 'var(--a-ink)', paddingBottom: 14, marginBottom: 18, borderBottom: '1px solid var(--a-border)' }}>{title}</div>
			<div style={{ display: 'grid', gap: 16 }}>{children}</div>
		</Card>
	);
}

function SummaryCard({ title, fields }: { title: React.ReactNode; fields: [string, string | string[]][] }) {
	return (
		<Card>
			<div style={{ paddingBottom: 14, marginBottom: 16, borderBottom: '1px solid var(--a-border)', fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 16, color: 'var(--a-ink)' }}>{title}</div>
			<dl style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '18px 28px', margin: 0 }}>
				{fields.map(([label, value]) => (
					<div key={label} style={{ minWidth: 0 }}>
						<dt style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--a-muted)', marginBottom: 7 }}>{label}</dt>
						<dd style={{ margin: 0 }}><Readout value={value} /></dd>
					</div>
				))}
			</dl>
		</Card>
	);
}

function Readout({ value }: { value: string | string[] }) {
	if (Array.isArray(value)) {
		if (value.length === 0) return <Dash />;
		return (
			<div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
				{value.map((v) => <span key={v} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, lineHeight: 1.3, padding: '4px 10px', borderRadius: 'var(--a-radius-pill)', background: 'var(--a-inset)', border: '1px solid var(--a-border)', color: 'var(--a-ink)' }}>{v}</span>)}
			</div>
		);
	}
	const text = value.trim();
	if (!text) return <Dash />;
	return <span style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--a-ink)', wordBreak: 'break-word' }}>{text}</span>;
}

function Dash() { return <span style={{ fontSize: 13.5, color: 'var(--a-faint)' }}>—</span>; }
