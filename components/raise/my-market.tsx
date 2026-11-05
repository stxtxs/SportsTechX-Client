'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, RefreshCw } from 'lucide-react';
import { qk } from '@/lib/query-keys';
import { apiRequest } from '@/lib/query-client';
import { Card, Tabs, Button, Loading, Empty, Logo, Flag, ComboBarLine } from '@/components/atlas';
import { companyHref, hrefOf } from '@/lib/routes';
import { fmtUsdB } from '@/components/features/market/format';

/**
 * Market → My market. The founder's OWN market: LLM-estimated TAM/SAM plus
 * grounded funding/CAGR/competitor aggregates for their sector. Moved verbatim
 * from the old Market "Analysis" tab so nothing is lost when the general market
 * analytics took that slot.
 */
interface YearFunding { year: number; amount_usd: number; deals: number; partial: boolean }
interface Grounded { sector?: string; total_funding_usd?: number; funded_companies?: number; companies_tracked?: number; deals?: number; funding_cagr_pct?: number | null; funding_by_year?: YearFunding[] }
/** `market_growth_pct` is the LLM's market-growth estimate (null/absent = none);
 *  `grounded.funding_cagr_pct` is computed from our deals over complete years. */
interface Methodology { estimating?: boolean; estimate_failed?: boolean; market_growth_pct?: number | null; approach?: string; grounded?: Grounded; assumptions?: string[]; sources?: string[] }
interface Competitor { id: string; name: string; website?: string | null; custom_logo_url?: string | null; hq_country: string | null; funding: string }
interface Market {
	unavailable?: boolean; reason?: string;
	tam: string | null; sam: string | null; cagr: string | null;
	classification: string | null; insight_md: string | null;
	methodology: Methodology | null; competitors: Competitor[] | null; updated_at?: string;
}

// One decimal, dropping a trailing ".0" so round values stay clean (2.3m / 340m).
const d1 = (x: number) => x.toFixed(1).replace(/\.0$/, '');
const eur = (v: string | null) => {
	if (v == null) return '—';
	const n = Number(v);
	return n >= 1e9 ? `EUR ${d1(n / 1e9)}bn` : n >= 1e6 ? `EUR ${d1(n / 1e6)}m` : `EUR ${n.toLocaleString()}`;
};
const usd = (n?: number | null) => (n == null ? '—' : n >= 1e9 ? `$${d1(n / 1e9)}bn` : n >= 1e6 ? `$${d1(n / 1e6)}m` : n > 0 ? `$${n.toLocaleString()}` : '—');

export function MyMarket() {
	const [tab, setTab] = useState<'size' | 'competitors'>('size');
	const [recomputing, setRecomputing] = useState(false);
	// The server flags a running TAM/SAM estimate (and clears the flag when it
	// lands, fails, or times out) — poll on that, and keep the previous figures up.
	// Interval refreshes are deduped, and the global 5-min dedupe made this poll a no-op.
	const { data, isLoading, mutate } = useSWR<Market>(qk.raise.market(), {
		dedupingInterval: 2000,
		refreshInterval: (d) => (d && !d.unavailable && d.methodology?.estimating ? 8000 : 0),
	});
	const estimating = !!data && !data.unavailable && !!data.methodology?.estimating;
	const sizeNote = (v: string | null) => (estimating || recomputing ? (v != null ? 'Updating estimate…' : 'Estimating…') : v != null ? 'Estimate' : data?.methodology?.estimate_failed ? 'Estimate failed — try Recompute' : 'Not available');
	const competitors = useMemo(() => data?.competitors ?? [], [data]);
	const g = data?.methodology?.grounded;
	const byYear = g?.funding_by_year ?? [];
	// The CAGR's span: first → last complete year that had funding.
	const full = byYear.filter((y) => !y.partial && y.amount_usd > 0);
	const cagrSpan = full.length >= 2 ? `${full[0]!.year}–${full[full.length - 1]!.year}` : '';
	const growth = data?.methodology?.market_growth_pct;

	const recompute = async () => {
		setRecomputing(true);
		try {
			const res = await apiRequest('GET', '/api/raise/market?force=1');
			if (!res.ok) throw new Error('Could not recompute');
			await mutate((await res.json()) as Market, { revalidate: false });
			toast.success('Market analysis recomputed');
		} catch (e) { toast.error((e as Error).message ?? 'Recompute failed'); }
		finally { setRecomputing(false); }
	};

	if (isLoading) return <Loading />;
	if (!data || data.unavailable) return (
		<Empty>Atlas needs your company category to map your market. Set it under{' '}
			<Link href={hrefOf('raise-settings')} style={{ color: 'var(--a-navy)' }}>Thesis settings → Category</Link>.</Empty>
	);

	return (
		<>
			<div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
				<Button variant="outline" size="sm" disabled={recomputing} onClick={() => void recompute()}>
					{recomputing ? <Loader2 className="animate-spin" size={13} /> : <RefreshCw size={13} />} Recompute
				</Button>
			</div>

			<div className="atlas-kpis">
				<Kpi label="Total market (TAM)" value={eur(data.tam)} note={sizeNote(data.tam)} />
				<Kpi label="Addressable market (SAM)" value={eur(data.sam)} note={sizeNote(data.sam)} />
				{/* The estimate's market growth when we have one; else our own funding
				    CAGR — labelled as such, it is not market growth. */}
				{growth != null
					? <Kpi label="Market growth" value={`${Number(growth).toFixed(1)}%`} note="Estimate · annual" />
					: <Kpi label="Funding CAGR" value={g?.funding_cagr_pct != null ? `${Number(g.funding_cagr_pct).toFixed(1)}%` : '—'} note={g?.funding_cagr_pct != null ? `Sector funding, ${cagrSpan}` : 'Not enough complete years'} />}
				<Kpi label="Competitors tracked" value={String(g?.companies_tracked ?? competitors.length)} note="Active companies in sector" />
				<Kpi label="Total funding raised" value={usd(g?.total_funding_usd)} />
			</div>

			<div style={{ marginTop: 36 }}>
				<Tabs tabs={[{ key: 'size', label: 'Market size' }, { key: 'competitors', label: g?.companies_tracked ? `Competitors · top ${competitors.length} of ${g.companies_tracked.toLocaleString()}` : 'Competitors' }]} value={tab} onChange={setTab} />
			</div>

			{tab === 'size' ? (
				<div style={{ marginTop: 27, display: 'grid', gap: 20 }}>
					{data.classification && (
						<Card glow="blue">
							<div className="atlas-eyebrow">Your market classification</div>
							<div style={{ fontSize: 18, fontFamily: 'var(--a-font)', fontWeight: 700, marginTop: 12 }}>{data.classification}</div>
						</Card>
					)}
					{byYear.length > 0 && (
						<Card className="atlas-chart-card">
							<div className="atlas-chart-card__head">
								<div className="atlas-section-title">Funding by year</div>
								<div className="atlas-section-note">Disclosed funding into {g?.sector ?? 'your sector'} · bars = value, line = rounds · {byYear[byYear.length - 1]!.year} is year to date</div>
							</div>
							<div className="atlas-chart-card__body">
								<ComboBarLine
									data={byYear.map((y) => ({ year: y.partial ? `${y.year} YTD` : y.year, amt: y.amount_usd, deals: y.deals }))}
									valueFormatter={fmtUsdB}
									height={220}
									barGradient
									barColors={['var(--a-chart-bar-top)', 'var(--a-chart-bar-bottom)']}
									lineColor="var(--a-chart-line)"
									dotColor="var(--a-chart-dot)"
									showValues={false}
									gridDashed={false}
									barLabel="Funding"
									lineLabel="Rounds"
								/>
							</div>
						</Card>
					)}
					{data.insight_md && (
						<Card>
							<div className="atlas-h2" style={{ marginBottom: 12 }}>Market insights</div>
							<p style={{ margin: 0, fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.6 }}>{data.insight_md}</p>
						</Card>
					)}
					<Card>
						<div className="atlas-eyebrow" style={{ marginBottom: 12 }}>How these figures are derived</div>
						{data.methodology?.approach && <p style={{ margin: '0 0 12px', fontSize: 13, color: 'var(--a-muted)', lineHeight: 1.5 }}>{data.methodology.approach}</p>}
						{g && (
							<div style={{ fontSize: 12, color: 'var(--a-muted)', display: 'grid', gap: 4, marginBottom: 12 }}>
								<span><strong style={{ color: 'var(--a-ink)' }}>Grounded (from our dataset):</strong> {usd(g.total_funding_usd)} raised · {g.funded_companies ?? 0} funded companies · {g.companies_tracked ?? 0} active companies · {g.deals ?? 0} deals{g.funding_cagr_pct != null ? ` · funding CAGR ${g.funding_cagr_pct}%${cagrSpan ? ` (${cagrSpan}, complete years)` : ''}` : ''}.</span>
							</div>
						)}
						{(data.methodology?.assumptions?.length ?? 0) > 0 && (
							<div style={{ marginBottom: 10 }}>
								<div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Assumptions</div>
								<ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 4 }}>{data.methodology!.assumptions!.map((a, i) => <li key={i} style={{ fontSize: 12, color: 'var(--a-muted)', lineHeight: 1.5 }}>{a}</li>)}</ul>
							</div>
						)}
						<div style={{ fontSize: 11, color: 'var(--a-faint)', marginTop: 8 }}>TAM/SAM are estimates; funding, competitor counts and CAGR are computed from SportsTechX data.</div>
					</Card>
				</div>
			) : (
				<div style={{ marginTop: 27 }}>
					{competitors.length === 0 ? <Empty>No competitors mapped yet.</Empty> : (<>
						<div className="atlas-section-note" style={{ marginBottom: 14 }}>Top {competitors.length} of {(g?.companies_tracked ?? competitors.length).toLocaleString()} active companies in your sector, by disclosed funding raised.</div>
						<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 240px), 1fr))', gap: 16 }}>
							{competitors.map((c) => (
								<Link key={c.id} href={companyHref(c.id)} className="atlas-card atlas-entity-card" style={{ minHeight: 120, textDecoration: 'none', color: 'inherit' }}>
									<div className="atlas-entity-card__head" style={{ marginBottom: 12 }}>
										<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={62} radius={9} />
										<div style={{ minWidth: 0, paddingTop: 11 }}>
											<div className="atlas-entity-card__name">{c.name}</div>
											{c.hq_country && <div className="atlas-entity-card__meta"><Flag cc={c.hq_country} size={11} />{c.hq_country}</div>}
										</div>
									</div>
									<div className="atlas-entity-card__actions" style={{ fontFamily: 'var(--a-mono)', fontSize: 10, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a-muted)' }}>{c.funding}</div>
								</Link>
							))}
						</div>
					</>)}
				</div>
			)}
		</>
	);
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
	return (
		<div className="atlas-kpi">
			<div className="atlas-kpi__label">{label}</div>
			<div className="atlas-kpi__value">{value}</div>
			{note && <div className="atlas-kpi__note">{note}</div>}
		</div>
	);
}
