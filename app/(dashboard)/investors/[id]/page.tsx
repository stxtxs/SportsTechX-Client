'use client';

import Link from 'next/link';
import { useMemo, useState, type ReactNode } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowUpLeft, ArrowUpRight, Archive, Globe, Loader2 } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { useListReturnHref } from '@/hooks/use-url-state';
import type { Deal, Investor, PipelineActivity as Activity, PipelineStage, PipelineUpdate } from '@/types/api';
import { apiRequest } from '@/lib/query-client';
import { refreshPipeline } from '@/lib/invalidate';
import { Action, Badge, Button, Card, Empty, Field, Input, Loading, Logo, Screen, Select } from '@/components/atlas';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { DatePicker } from '@/components/atlas/ui/date-picker';
import { SaveInvestorToWatchlist } from '@/components/raise/save-investor-to-watchlist';
import { categoryLabel } from '@/components/raise/investors';
import { fmtUsd, place } from '@/components/features/market/format';
import { BRAND, fmtDate } from '@/components/features/company/company-profile';
import '@/components/features/company/company-profile.css';

/**
 * Investor profile — the same layout as the company profile (header with name,
 * links and actions; a facts card; a history table; a side rail), so the two
 * read as one product. Raise users also get their pipeline record for this
 * investor (stage, contact, next step, activity), unchanged from before.
 *
 * Data: GET /api/investors/:id, /thesis (stages, geography, cheque range), and
 * the deals they took part in. The pipeline is Raise-only (`@RequireTier('raise')`),
 * so it isn't fetched for anyone else — that would 402 and open the plan modal.
 */

interface ThesisBundle {
	thesis: { amount_min_usd?: string | null; amount_max_usd?: string | null } | null;
	round_types: Array<{ name: string }>;
	geo: Array<{ scope_type: string; scope_value: string }>;
}
interface Pipe {
	id: string; investor_id: string | null; stage: PipelineStage; contact_name: string | null;
	potential_amount: string | null; last_contact_at: string | null; next_step: string | null;
	next_step_due: string | null; notes: string | null;
}

const STAGES: [string, string][] = [
	['target', 'Target'], ['contacted', 'Contacted'], ['in_conversation', 'In conversation'],
	['due_diligence', 'Due diligence'], ['term_sheet', 'Term sheet'], ['committed', 'Committed'],
	['closed', 'Closed'], ['passed', 'Passed'],
];
const STAGE_LABEL = Object.fromEntries(STAGES);
const ext = (u: string | null) => (u ? (/^(https?:|mailto:)/.test(u) ? u : `https://${u}`) : null);

/** "$500K – $2M" from the thesis cheque range; null when neither end is known. */
function chequeRange(t: ThesisBundle['thesis']): string | null {
	const lo = t?.amount_min_usd != null ? Number(t.amount_min_usd) : null;
	const hi = t?.amount_max_usd != null ? Number(t.amount_max_usd) : null;
	if (lo && hi) return `${fmtUsd(lo)} – ${fmtUsd(hi)}`;
	if (lo) return `From ${fmtUsd(lo)}`;
	if (hi) return `Up to ${fmtUsd(hi)}`;
	return null;
}

export default function InvestorProfilePage() {
	const id = String(useParams().id);
	const { data: profile } = useUserProfile();
	const isRaise = getUserType(profile) === 'raise';
	// "Return to results" lands on the investor list as the user left it (filters, page).
	const back = useListReturnHref(hrefOf('investors'));
	const { data: inv, isLoading, error } = useSWR<Investor>(qk.investors.detail(id));
	const { data: bundle } = useSWR<ThesisBundle>(qk.investors.thesis(id));
	const deals = useSWR<{ data: Deal[] }>(qk.deals.list({ investor_id: id, sort: '-announced_date', limit: 20 }));
	const pipe = useSWR<{ data: Pipe[] }>(isRaise ? qk.raise.pipeline() : null);
	const record = useMemo(() => (pipe.data?.data ?? []).find((r) => r.investor_id === id) ?? null, [pipe.data, id]);

	if (error) return <Screen><Empty>Investor not found. <Link href={back}>Back to investors</Link></Empty></Screen>;
	if (isLoading || !inv) return <Screen><Loading /></Screen>;

	const links = ([
		['website', 'Website', ext(inv.website), <Globe key="website" size={15} aria-hidden="true" />],
		['linkedin', 'LinkedIn', ext(inv.linkedin_url), BRAND.linkedin],
		['twitter', 'X (Twitter)', ext(inv.twitter_url), BRAND.x],
		['instagram', 'Instagram', ext(inv.instagram_url), BRAND.instagram],
		['facebook', 'Facebook', ext(inv.facebook_url), BRAND.facebook],
		['youtube', 'YouTube', ext(inv.youtube_url), BRAND.youtube],
		// No contact email here: about a third of them are a named person's
		// address, and the profile never showed them before this layout.
	] as Array<[string, string, string | null, ReactNode]>).filter((l) => l[2]);

	const stages = bundle?.round_types?.map((r) => r.name).join(', ');
	// Thesis geography (where they invest) is separate from HQ (where they sit).
	const geo = bundle?.geo?.map((g) => g.scope_value).join(', ');
	const investments = inv.num_investments ?? inv.deals_count;
	const facts: Array<[string, ReactNode, boolean?]> = [
		['Headquarters', place(inv.hq_city, inv.hq_country) || inv.hq_region || '—'],
		['Launched', inv.year_launched ? String(inv.year_launched) : '—'],
		['Type', inv.category ? categoryLabel(inv.category) : '—'],
		// Only when known: the column defaults to false, so false mostly means
		// "never curated" (~1,900 investors), not "stopped investing".
		...(inv.actively_investing ? [['Actively investing', 'Yes'] as [string, ReactNode]] : []),
		['Stages', stages || '—', true],
		['Investment geography', geo || '—', true],
		['Typical cheque', chequeRange(bundle?.thesis ?? null) ?? '—'],
		['Investments', investments != null ? String(investments) : '—'],
		['Exits', inv.num_exits != null ? String(inv.num_exits) : '—'],
	];

	const dealRows = deals.data?.data ?? [];
	// Portfolio = distinct companies from their deals, newest first.
	const portfolio = [...new Map(dealRows.filter((d) => d.company_name).map((d) => [d.company_id, d])).values()].slice(0, 8);

	return (
		<Screen>
			<article className="atlas-co">
				<header className="atlas-co__head">
					<div className="atlas-co__id">
						<Logo co={{ name: inv.name, website: inv.website, custom_logo_url: inv.logo_url }} size={72} radius={10} />
						<div>
							<h1 className="atlas-co__name">{inv.name}{inv.is_verified && <span style={{ marginLeft: 6, display: 'inline-flex', verticalAlign: 'middle' }}><VerifiedBadge size={20} /></span>}</h1>
							{links.length > 0 && (
								<div className="atlas-co__socials">
									{links.map(([key, label, href, icon]) => (
										<a key={key} href={href as string} target="_blank" rel="noopener noreferrer" className="atlas-co__social" aria-label={label} title={label}>{icon}</a>
									))}
								</div>
							)}
						</div>
					</div>
					<div className="atlas-co__actions">
						{record && <Badge tone="navy">{STAGE_LABEL[record.stage] ?? record.stage}</Badge>}
						{isRaise && <SaveInvestorToWatchlist investorId={inv.id} investorName={inv.name} align="end" />}
						<Action icon={<ArrowUpLeft />} href={back}>Return to results</Action>
					</div>
				</header>

				<div className="atlas-co__grid">
					<div className="atlas-co__main">
						{/* Keyed: the form is a draft seeded from the record, so a re-added or
						    moved record must start a fresh draft, not keep the old values. */}
						{record && <PipelineRecord key={`${record.id}:${record.stage}`} record={record} onChanged={() => void refreshPipeline()} />}

						<section className="atlas-card atlas-co__facts" aria-label="About the investor">
							{inv.description && <p className="atlas-co__about">{inv.description}</p>}
							{facts.map(([k, v, wide]) => (
								<div key={k} className={wide ? 'atlas-co__fact--wide' : undefined}><div className="atlas-co__fact-k">{k}</div><div className="atlas-co__fact-v">{v}</div></div>
							))}
						</section>

						<section className="atlas-card atlas-chart-card atlas-co__funding">
							<div className="atlas-co__card-head">
								<h2 className="atlas-co__h2">Investment history</h2>
								<span className="atlas-co__aside">Disclosed rounds</span>
							</div>
							{deals.isLoading ? <Loading /> : dealRows.length === 0 ? (
								<p className="atlas-co__empty">No disclosed investments on record.</p>
							) : (
								<div className="atlas-co__deals" role="table" aria-label="Investments">
									<div className="atlas-co__deal atlas-co__deal--head" role="row">
										<span role="columnheader">Date</span>
										<span role="columnheader">Company</span>
										<span role="columnheader">Funding Type</span>
										<span role="columnheader">Money Raised</span>
									</div>
									{dealRows.map((d) => (
										<div key={d.id} className="atlas-co__deal" role="row">
											<span role="cell">{fmtDate(d.announced_date)}</span>
											<span className="atlas-co__investors" role="cell">
												{d.company_slug
													? <Link href={`/companies/${d.company_slug}`} className="atlas-co__inv-link">{d.company_name ?? 'Company'}</Link>
													: (d.company_name ?? 'Company')}
											</span>
											<span role="cell">{d.round_type_name ?? 'Round'}</span>
											<span className="atlas-co__amt" role="cell">{d.amount_usd == null ? '—' : fmtUsd(Number(d.amount_usd))}</span>
										</div>
									))}
								</div>
							)}
						</section>
					</div>

					<aside className="atlas-co__rail">
						<section className="atlas-card atlas-co__side">
							<h2 className="atlas-co__h">Portfolio</h2>
							<p className="atlas-co__sub">Companies from their recent disclosed rounds</p>
							{portfolio.length === 0 ? <p className="atlas-co__empty">No portfolio companies on record.</p> : portfolio.map((d) => (
								<Link key={d.company_id} href={`/companies/${d.company_slug ?? d.company_id}`} className="atlas-co__rel">
									<span>
										<span className="atlas-co__rel-name">{d.company_name}</span>
										<span className="atlas-co__rel-meta">{[d.round_type_name, d.announced_date ? new Date(d.announced_date).getFullYear() : null].filter(Boolean).join(' · ')}</span>
									</span>
									<span className="atlas-co__rel-go" aria-hidden="true"><ArrowUpRight size={12} /></span>
								</Link>
							))}
						</section>
					</aside>
				</div>
			</article>
		</Screen>
	);
}

function PipelineRecord({ record, onChanged }: { record: Pipe; onChanged: () => void }) {
	const [f, setF] = useState<Partial<Pipe>>(record);
	const [busy, setBusy] = useState(false);
	const { data: act } = useSWR<{ data: Activity[] }>(qk.raise.pipelineActivity(record.id));
	const set = (k: keyof Pipe, v: unknown) => setF((x) => ({ ...x, [k]: v }));

	const save = async (patch: PipelineUpdate) => {
		setBusy(true);
		try { await apiRequest('PATCH', `/api/raise/pipeline/${record.id}`, patch); toast.success('Updated'); onChanged(); }
		catch (e) { toast.error((e as Error).message); }
		finally { setBusy(false); }
	};

	return (
		<Card focus glow="blue" style={{ padding: '22px 23px 24px' }}>
			<div style={{ fontSize: 18, fontFamily: 'var(--a-font)', fontWeight: 700, marginBottom: 20 }}>Your watchlist record</div>
			<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
				<Field label="Stage"><Select value={f.stage} onChange={(e) => set('stage', e.target.value)} options={STAGES} /></Field>
				<Field label="Relevant contact"><Input value={f.contact_name ?? ''} onChange={(e) => set('contact_name', e.target.value)} /></Field>
				<Field label="Potential investment"><Input type="number" min={0} value={(f.potential_amount as string) ?? ''} onChange={(e) => set('potential_amount', e.target.value)} /></Field>
				<Field label="Next step"><Input value={f.next_step ?? ''} onChange={(e) => set('next_step', e.target.value)} /></Field>
				<Field label="Next step due"><DatePicker value={f.next_step_due ?? ''} onChange={(v) => set('next_step_due', v)} /></Field>
				<Field label="Notes"><Input value={f.notes ?? ''} onChange={(e) => set('notes', e.target.value)} /></Field>
			</div>
			<div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
				<Button size="sm" disabled={busy} onClick={() => void save({ stage: f.stage, contact_name: f.contact_name || null, potential_amount: f.potential_amount || null, next_step: f.next_step || null, next_step_due: f.next_step_due || null, notes: f.notes || null })}>{busy ? <Loader2 className="animate-spin" size={13} /> : 'Save changes'}</Button>
				<Button size="sm" variant="danger" disabled={busy} onClick={() => void save({ is_archived: true })}><Archive size={13} /> Archive investor</Button>
			</div>

			<hr className="atlas-divider" style={{ margin: '22px 0 16px' }} />
			<div className="atlas-eyebrow" style={{ marginBottom: 6 }}>Activity history</div>
			<div>
				{(act?.data ?? []).map((a, i) => (
					<div key={i} style={{ fontSize: 12, color: 'var(--a-muted)', display: 'flex', justifyContent: 'space-between', gap: 10, padding: '11px 0', borderTop: i === 0 ? 'none' : '1px solid var(--a-border)' }}>
						<span>{describe(a)}</span><span style={{ color: 'var(--a-faint)', fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em' }}>{new Date(a.occurred_at).toLocaleDateString()}</span>
					</div>
				))}
				{(act?.data?.length ?? 0) === 0 && <div style={{ fontSize: 12, color: 'var(--a-faint)', padding: '11px 0' }}>No activity yet.</div>}
			</div>
		</Card>
	);
}

function describe(a: Activity): string {
	if (a.type === 'created') return 'Added to watchlist';
	if (a.type === 'stage_change') return `Moved ${String(a.payload?.from ?? '')} → ${String(a.payload?.to ?? '')}`;
	if (a.type === 'commitment') return `Amount recorded: €${Number(a.payload?.amount ?? 0).toLocaleString()}`;
	return a.type;
}
