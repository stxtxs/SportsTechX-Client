'use client';

import Link from 'next/link';
import { useState, useSyncExternalStore } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowUpRight } from 'lucide-react';
import { Button, Empty, Field, FilterBar, Input, Loading, Progress, Seg, Select, cx } from '@/components/atlas';
import { convert, displayCurrency, subscribeCurrency, type DisplayCurrency } from '@/lib/currency';
import { matchRaise, type Match } from './raise-match';
import { useRaiseMatchPrefs } from './use-raise-match';
import { RaiseBookmark } from './raise-bookmark';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { DatePicker } from '@/components/atlas/ui/date-picker';
import { useUrlSync, useUrlReader } from '@/hooks/use-url-state';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import {
	LEAD_LABEL, MY_STATUS, closeLabel, committedPct, companyLabel, money, raiseLabel, roundLabel, submitterLabel,
	type DealRow, type DealTab, type MyDealRow,
} from './deal-types';

/**
 * Deal Flow (Claude Design "Deal Flow"): Featured deal, Verified Raises and
 * From the Circle, one page per tab, styled as in the design.
 *
 * The API only ever lists `status = 'live'` deals, so nothing here can be a
 * draft or a pending submission — which is why the old "Pending eligibility
 * check" pill is gone along with the sample data that produced it.
 *
 * The old "Thesis match" pill is gone too: there is no thesis-match signal in
 * the projection, and inventing one client-side from a sector *name* would be a
 * guess dressed up as a match.
 *
 * `is_featured` is orthogonal to `source`, so the All tab takes one request and
 * splits it locally rather than firing three.
 */
export const dealHref = (id: string) => `${hrefOf('deal-flow')}/${id}`;
/** Reopen one of your own submissions in the share wizard. */
const editHref = (id: string) => `${hrefOf('deal-flow-circle')}/share?draft=${id}`;

/**
 * The list caps at 50 server-side and returns no total, so there is nothing to
 * page against. 50 live deals is far beyond anything the table holds; if that
 * ever changes this needs real paging rather than a bigger number.
 */
/** One page of Deal Flow; exported so other views share the same request. */
export const LIMIT = 50;

export function useDealFlow(tab: DealTab) {
	return useSWR<{ data: DealRow[] }>(qk.scout.dealflow({ tab, limit: LIMIT }));
}

export function DealFlow({ tab = 'all' }: { tab?: DealTab }) {
	const { data, isLoading, error } = useDealFlow(tab);
	const matchPrefs = useRaiseMatchPrefs();
	const currency = useSyncExternalStore(subscribeCurrency, displayCurrency, () => 'USD' as DisplayCurrency);

	// The platform filter bar (6.1) and the Matched / All switch (6.2), kept in
	// the URL so they survive Back from a raise and can be shared.
	const url = useUrlReader();
	const [q, setQ] = useState(() => url.str('q', '', 80));
	const [sector, setSector] = useState(() => url.str('sector', '', 120));
	const [stage, setStage] = useState(() => url.str('stage', '', 60));
	const [geo, setGeo] = useState(() => url.str('geo', '', 80));
	const [size, setSize] = useState(() => url.oneOf('size', ['', 'lt1', '1to5', 'gt5'] as const, ''));
	const [val, setVal] = useState(() => url.oneOf('val', ['', 'lt10', '10to25', 'gt25', 'none'] as const, ''));
	const [sort, setSort] = useState(() => url.oneOf('sort', ['match', 'closing', 'newest'] as const, 'match'));
	const [mode, setMode] = useState(() => url.oneOf('list', ['all', 'matched'] as const, 'all'));
	useUrlSync({ q: q || undefined, sector: sector || undefined, stage: stage || undefined, geo: geo || undefined, size: size || undefined, val: val || undefined, sort: sort !== 'match' ? sort : undefined, list: mode !== 'all' ? mode : undefined });

	// Every Deal Flow route 403s without a `scout_profiles` row, and most Scout
	// accounts do not have one — so this is the common path, not an edge case.
	// `SCOUT_NOT_SET_UP` is in EXPECTED_CODES, so it never toasts or logs.
	const needsThesis = (error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	const deals = data?.data ?? [];

	if (isLoading) return <Loading />;
	if (needsThesis) {
		return (
			<Empty>
				Set up your preferences and we&rsquo;ll show you the raises that fit them.{' '}
				<Link href={hrefOf('interests')} style={{ color: 'var(--a-accent)' }}>Set up your preferences</Link>
			</Empty>
		);
	}
	if (error) return <Empty>We couldn&rsquo;t load Deal Flow just now. Please try again.</Empty>;

	// This tab's raises. Featured shows every featured raise, in the API's order (4.2).
	const tabRows = deals.filter((d) => (tab === 'featured' ? d.is_featured : tab === 'verified' ? d.source === 'verified_raise' : tab === 'circle' ? d.source === 'circle' : true));
	const country = (d: DealRow) => d.company_hq?.split(',').pop()?.trim() ?? '';
	const inShown = (d: DealRow, n: string | null) => (n ? convert(Number(n), d.currency_code ?? 'EUR', currency) : null);
	const opts = (vals: (string | null | undefined)[]) => [...new Set(vals.filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b)).map((v) => [v, v] as [string, string]);
	const term = q.trim().toLowerCase();
	const sym = currency === 'USD' ? '$' : '€';

	const scored = tabRows.map((d) => ({ d, m: matchRaise({ sector: d.sector, company_hq: d.company_hq, round: roundLabel(d.round_type), tags: d.tags }, matchPrefs) }));
	const shown = scored
		// Matched: Avoid hides a raise, and so does meeting none of the filled-in preferences (6.2).
		.filter(({ m }) => mode === 'all' || (!m.hidden && m.pct !== 0))
		.filter(({ d }) => !term || `${companyLabel(d)} ${d.company_description ?? ''} ${d.sector ?? ''}`.toLowerCase().includes(term))
		.filter(({ d }) => !sector || d.sector === sector)
		.filter(({ d }) => !stage || roundLabel(d.round_type) === stage)
		.filter(({ d }) => !geo || country(d) === geo)
		.filter(({ d }) => {
			if (!size) return true;
			const t = inShown(d, d.target_amount);
			if (t == null) return false;
			return size === 'lt1' ? t < 1e6 : size === '1to5' ? t >= 1e6 && t <= 5e6 : t > 5e6;
		})
		.filter(({ d }) => {
			if (!val) return true;
			const v = inShown(d, d.valuation_amount);
			if (val === 'none') return v == null;
			if (v == null) return false;
			return val === 'lt10' ? v < 10e6 : val === '10to25' ? v >= 10e6 && v <= 25e6 : v > 25e6;
		});
	// Best match: match % first, then A to Z (6.5). Closing soonest: target close. Newest: the API's order.
	const byName = (a: DealRow, b: DealRow) => companyLabel(a).localeCompare(companyLabel(b));
	if (sort === 'match') shown.sort((a, b) => (b.m.pct ?? -1) - (a.m.pct ?? -1) || byName(a.d, b.d));
	if (sort === 'closing') shown.sort((a, b) => (a.d.target_close_date ?? '9999').localeCompare(b.d.target_close_date ?? '9999'));

	const filtersOn = !!(q || sector || stage || geo || size || val);
	const clear = () => { setQ(''); setSector(''); setStage(''); setGeo(''); setSize(''); setVal(''); };
	const empty = tab === 'featured'
		? 'No featured raises right now. SportsTechX features new raises every week.'
		: tab === 'circle'
			? 'Nothing shared by Boardroom members yet. If you’re in a round, share it with Boardroom.'
			: 'No verified raises right now. New ones show up here as soon as SportsTechX verifies them.';

	return (
		<div className="scout-df">
			{tab === 'circle' && <MySubmissions />}

			{tab === 'circle' && (
				<div className="scout-df__head scout-df__head--bar">
					{/* From Boardroom (7.2): the built Circle section, renamed; same cards as the raise tabs. */}
					<p className="scout-df__note">Raises shared by Boardroom members. Eligibility checked by SportsTechX; not independently selected or endorsed.</p>
					<Link href={`${hrefOf('deal-flow-circle')}/share`} className="scout-df__btn">+ Share a raise</Link>
				</div>
			)}

			{tabRows.length > 0 && (
				<FilterBar
					search={{ value: q, onChange: setQ, placeholder: 'Search raises' }}
					groups={[{
						label: 'Raise',
						filters: [
							{ kind: 'select', key: 'sector', label: 'Sector', value: sector, onChange: setSector, options: opts(tabRows.map((d) => d.sector)) },
							{ kind: 'select', key: 'stage', label: 'Stage', value: stage, onChange: setStage, options: opts(tabRows.map((d) => roundLabel(d.round_type))) },
							{ kind: 'select', key: 'geo', label: 'Geography', value: geo, onChange: setGeo, options: opts(tabRows.map(country)) },
							{ kind: 'select', key: 'size', label: 'Target size', value: size, onChange: (v) => setSize(v as typeof size), options: [['lt1', `Under ${sym}1M`], ['1to5', `${sym}1M – ${sym}5M`], ['gt5', `Over ${sym}5M`]] },
							{ kind: 'select', key: 'val', label: 'Valuation', value: val, onChange: (v) => setVal(v as typeof val), options: [['lt10', `Under ${sym}10M`], ['10to25', `${sym}10M – ${sym}25M`], ['gt25', `Over ${sym}25M`], ['none', 'Not disclosed']] },
						],
					}]}
					sort={{ value: sort, onChange: (v) => setSort(v as typeof sort), options: [['match', 'Best match'], ['closing', 'Closing soonest'], ['newest', 'Newest']] }}
					canClear={filtersOn}
					onClear={clear}
					actions={<Seg<'matched' | 'all'> ariaLabel="Show" value={mode} onChange={setMode} options={[{ key: 'matched', label: 'Matched' }, { key: 'all', label: 'All' }]} />}
					count={`${shown.length} ${shown.length === 1 ? 'raise' : 'raises'}`}
				/>
			)}

			{tabRows.length === 0 ? <Empty>{empty}</Empty>
				: shown.length === 0 && mode === 'matched' && !filtersOn ? (
					<Empty>
						No raises match your preferences right now.{' '}
						<Button size="sm" variant="outline" onClick={() => setMode('all')}>Show all</Button>{' '}
						<Button size="sm" href={hrefOf('interests')}>Edit preferences</Button>
					</Empty>
				)
				: shown.length === 0 ? <Empty>No raises match these filters. <button type="button" className="scout-df__filter-clear" onClick={clear}>Clear filters</button></Empty>
				: <div className="scout-df__grid">{shown.map(({ d, m }) => <RaiseCard key={d.id} d={d} match={m} />)}</div>}
		</div>
	);
}

/**
 * Your own submissions, above the Circle grid.
 *
 * The public list only ever shows `live` deals, so without this a submitter had
 * nowhere to see a draft, learn that their deal was still pending, or — the one
 * that actually matters — read **why** changes were requested. `review_notes`
 * is returned by `/mine` and by nothing else.
 *
 * Renders nothing at all when you have no submissions, which is the common
 * case: only a verified investor (or a granted account) can submit.
 * `SCOUT_NOT_SET_UP` is swallowed for the same reason — the surrounding page
 * already says it.
 */
function MySubmissions() {
	const { data, mutate } = useSWR<{ data: MyDealRow[] }>(qk.scout.dealflowMine());
	const mine = data?.data ?? [];
	if (mine.length === 0) return null;

	return (
		<section className="scout-df__section">
			<div className="scout-df__head">
				<h2 className="scout-df__title">Your submissions</h2>
				<span className="scout-df__aside">Only visible to you</span>
			</div>
			<div className="scout-df__grid">
				{mine.map((m) => {
					const target = money(m.target_amount, m.currency_code);
					return (
						<article key={m.id} className="scout-df-card scout-df-card--circle">
							<div className="scout-df-card__name">
								{m.company_name ?? 'Untitled draft'}
							</div>
							<div className="scout-df-card__round">
								{roundLabel(m.round_type) ?? 'Round'}{target ? ` · ${target} target` : ''}
							</div>
							<div className="scout-df-card__by">{MY_STATUS[m.status] ?? m.status}</div>
							{/* The whole reason this section exists: a returned deal shows as
							    `pending` to its submitter unless the note is surfaced. */}
							{m.review_notes && (
								<p className="scout-df-card__desc">
									<strong>From the review team:</strong> {m.review_notes}
								</p>
							)}
							{!m.founder_consent && m.status === 'draft' && (
								<span className="scout-df-pending">Needs founder consent before it can be submitted</span>
							)}
							{/* A returned deal used to be a dead end: the note said what to
							    change and nothing could be changed. `PATCH :id` accepts both
							    of these statuses, so both get a way back into the wizard. */}
							{(m.status === 'draft' || m.status === 'changes_requested') && (
								<Link href={editHref(m.id)} className="scout-df-card__link">
									{m.status === 'draft' ? 'Continue this draft →' : 'Make the changes →'}
								</Link>
							)}
							{m.status === 'live' && (
								<>
									<div className="scout-df-card__interest">
										<strong>{m.interest_count}</strong> investor{m.interest_count === 1 ? '' : 's'} interested
									</div>
									{m.interest_count > 0 && (
										<p className="scout-df-card__reachout">The Atlas team will reach out within 24 hours to coordinate introductions.</p>
									)}
									<Link href={dealHref(m.id)} className="scout-df-card__link">View listing →</Link>
									<LiveEdit m={m} onSaved={() => { void mutate(); void refreshPaths('/api/scout/dealflow'); }} />
								</>
							)}
						</article>
					);
				})}
			</div>
		</section>
	);
}

/**
 * The three fields `PATCH /scout/dealflow/:id/live` lets a submitter move after
 * their deal is listed: how much is committed, whether a lead is confirmed, and
 * when it closes. Everything else is frozen once STX has reviewed it, which is
 * why this is a three-field panel and not the wizard again.
 *
 * The endpoint `COALESCE`s each column, so an untouched field is left alone
 * rather than cleared — a blank input here means "no change", not "set to null".
 */
function LiveEdit({ m, onSaved }: { m: MyDealRow; onSaved: () => void }) {
	const [open, setOpen] = useState(false);
	const [committed, setCommitted] = useState(m.committed_amount == null ? '' : String(Number(m.committed_amount)));
	const [lead, setLead] = useState(m.lead_status ?? '');
	const [close, setClose] = useState((m.target_close_date ?? '').slice(0, 10));
	const [busy, setBusy] = useState(false);

	if (!open) {
		return (
			<button type="button" className="scout-link" onClick={() => setOpen(true)} style={{ alignSelf: 'flex-start', marginTop: 8 }}>
				Update progress
			</button>
		);
	}

	const save = async () => {
		setBusy(true);
		try {
			const amount = Number(committed.replace(/[^0-9.]/g, ''));
			const res = await apiRequest('PATCH', `/api/scout/dealflow/${m.id}/live`, {
				committed_amount: Number.isFinite(amount) && amount > 0 ? amount : null,
				lead_status: lead || null,
				target_close_date: close || null,
			});
			if (!res.ok) throw new Error(String(res.status));
			toast.success('Updated');
			onSaved();
			setOpen(false);
		} catch {
			toast.error('We could not save that. Please try again.');
		} finally { setBusy(false); }
	};

	return (
		<div style={{ marginTop: 10, display: 'grid', gap: 8 }}>
			<Field label={`Committed to date (${m.currency_code ?? 'EUR'})`}>
				<Input type="number" min="0" step={1000} value={committed} onChange={(e) => setCommitted(e.target.value)} placeholder="500000" />
			</Field>
			<Field label="Lead status">
				<Select value={lead} onChange={(e) => setLead(e.target.value)} options={Object.entries(LEAD_LABEL)} placeholder="No change" />
			</Field>
			<Field label="Target close date">
				<DatePicker value={close} onChange={setClose} />
			</Field>
			<div style={{ display: 'flex', gap: 8 }}>
				<Button size="sm" disabled={busy} onClick={() => void save()}>{busy ? 'Saving…' : 'Save'}</Button>
				<Button size="sm" variant="outline" disabled={busy} onClick={() => setOpen(false)}>Cancel</Button>
			</div>
		</div>
	);
}

/**
 * One card for Verified and Featured raises (Deal Flow 4.1, 4.3, 4.4): the
 * name with the verified tick, round and target, a progress bar, committed,
 * description and target close. A featured raise carries the label and the
 * solution-colour gradient. The whole card opens the raise through its "Open"
 * pill, as on Home and Reports. The save bookmark waits on 6.8 (raises in
 * Watchlists, Backend).
 */
export function RaiseCard({ d, match }: { d: DealRow; match?: Match }) {
	const pct = committedPct(d);
	const target = money(d.target_amount, d.currency_code);
	const committed = money(d.committed_amount, d.currency_code);
	const close = closeLabel(d.target_close_date);
	const desc = d.company_description?.trim();
	return (
		<article className={cx('scout-raise', d.is_featured && 'is-featured')}>
			<div className="scout-raise__top">
				<span className="scout-raise__tag">
					{raiseLabel(d)}
					{match?.pct != null && <span className="scout-raise__pct"> · {match.pct}% match</span>}
				</span>
				<span className="atlas-feed-card__actions">
					<RaiseBookmark d={d} />
					<Link href={dealHref(d.id)} className="atlas-feed-card__action scout-raise__open" onClick={rememberList}>
						Open <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden="true" />
					</Link>
				</span>
			</div>
			<h3 className="scout-raise__name">
				{companyLabel(d)}
				{d.source === 'verified_raise' && <span className="scout-raise__tick" title="Verified by SportsTechX"><VerifiedBadge size={16} /></span>}
			</h3>
			<div className="scout-raise__round">{roundLabel(d.round_type) ?? 'Round'}{target ? ` · ${target} target` : ''}</div>
			{/* Only drawn when both figures are known — a 0% bar would read as
			    "nothing raised" rather than "not disclosed". */}
			{pct !== null && <div className="scout-df-bar"><Progress pct={pct} /></div>}
			{committed && <div className="scout-raise__committed">{committed} committed</div>}
			{desc && <p className="scout-raise__desc">{desc}</p>}
			{/* Why it matched: up to three pills in the Preferences style (6.5). */}
			{match && match.why.length > 0 && <div className="scout-tags scout-raise__why">{match.why.map((w) => <span key={w} className="scout-tag">{w}</span>)}</div>}
			{close && <div className="scout-raise__close">Target close: {close}</div>}
			{d.source === 'circle' && <div className="scout-raise__close">Shared by {submitterLabel(d)}</div>}
		</article>
	);
}

/** The list the user opened a raise from, so the raise page's "Back to results" returns there (3.1). */
function rememberList() {
	try { sessionStorage.setItem('stx:dealflow:from', window.location.pathname + window.location.search); } catch { /* private mode */ }
}

