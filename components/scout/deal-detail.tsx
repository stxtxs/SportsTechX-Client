'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { toast } from 'sonner';
import { ArrowUpLeft, Globe, X } from 'lucide-react';
import { Action, Empty, Loading, Logo, Progress, cx } from '@/components/atlas';
import { VerifiedBadge } from '@/components/atlas/icons/verified-badge';
import { SectorPath } from '@/components/features/company/company-profile';
import '@/components/features/company/company-profile.css';
import { useBackOr } from '@/hooks/use-back';
import { RaiseBookmark } from './raise-bookmark';
import { clearLegacy, readLegacy } from '@/hooks/legacy-local';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { hrefOf } from '@/lib/routes';
import {
	INTEREST_LABEL, canOpenDocs, closeLabel, committedPct, companyLabel, instrumentLabel, leadLabel, money, raiseLabel, roundLabel,
	relationshipLabel, submitterLabel, valuationLabel, type DealRow,
} from './deal-types';
import { fmtUsd } from '@/components/features/market/format';
import { fmtMonth, yearOf } from '@/lib/format';
import type { Deal } from '@/types/api';

/**
 * One Deal Flow opportunity: terms, summary, documents, introduction request.
 *
 * Three things here are load-bearing for the privacy model:
 *
 * 1. **Identity comes from the flags, not from nulls.** `company_anonymous` /
 *    `submitter_anonymous` / `disclosed` are always returned, so the page says
 *    "undisclosed" deliberately rather than rendering a blank.
 * 2. **Documents are offered only when the server would actually release
 *    them** — see `canOpenDocs`. An anonymous company's materials need
 *    disclosure even when `materials_access` is `immediate`, and the server
 *    answers one uniform 404 for both "no deck" and "not yours", so a wrongly
 *    offered button is indistinguishable from a bug.
 * 3. **Requesting an introduction grants nothing.** The response states
 *    `disclosed: false` explicitly so a client cannot mistake acceptance for
 *    access, and this page reflects the request's status, never "granted".
 *
 * `interest_status` on the row replaced a localStorage list of deal ids, so the
 * button is now right across devices and after a reload.
 */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function DealDetail({ id }: { id: string }) {
	// A malformed id reaches Postgres as a bad uuid and surfaces as a 500 — there
	// is no ParseUUIDPipe on the route — so refuse it here instead of asking.
	const valid = UUID.test(id);
	const { data: d, error, isLoading, mutate } = useSWR<DealRow>(valid ? qk.scout.deal(id) : null);

	// Sector path (Sector › Sub-sector › Sub-sub sector), as on the company page (5.4).
	const sectors = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	// "Back to results" returns to the tab the raise was opened from, with its
	// filters and scroll (the browser's back, when the user came from there);
	// opened from a link, it goes to that tab if known, else Verified Raises (3.1).
	const backOr = useBackOr();
	const router = useRouter();
	const backHref = hrefOf('deal-flow-verified');
	const back = (e: React.MouseEvent) => {
		backOr(e);
		if (e.defaultPrevented) return;
		let from: string | null = null;
		try { from = sessionStorage.getItem('stx:dealflow:from'); } catch { /* private mode */ }
		if (from) { e.preventDefault(); router.push(from); }
	};
	const [open, setOpen] = useState(false);
	const [note, setNote] = useState('');
	const [busy, setBusy] = useState(false);

	// Watches used to live in this browser only — push any left there to the server once.
	useEffect(() => {
		const legacy = readLegacy<string[]>('watched');
		if (!legacy?.length) return;
		void Promise.allSettled(legacy.filter((x) => UUID.test(x)).map((x) => apiRequest('PUT', `/api/scout/dealflow/${x}/watch`)))
			.then((rs) => {
				// Keep the list if anything failed for a reason other than "deal gone" (404).
				if (rs.every((r) => r.status === 'fulfilled' || (r.reason as { status?: number })?.status === 404)) clearLegacy('watched');
				void mutate();
			});
	}, [mutate]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [open]);

	const needsThesis = (error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	if (needsThesis) {
		return (
			<Empty>
				Set up your investment thesis to view deal flow.{' '}
				<Link href={hrefOf('interests')} style={{ color: 'var(--a-accent)' }}>Set up your preferences</Link>
			</Empty>
		);
	}
	if (isLoading && valid) return <Loading />;
	// The server returns one uniform 404 for "gone", "never existed" and "not
	// live" so that nothing is distinguishable by its error. Say one thing.
	if (!valid || error || !d) {
		return <Empty>This raise isn&rsquo;t available. <Link href={backHref} onClick={back}>Back to results</Link></Empty>;
	}

	const isCircle = d.source === 'circle';
	const label = raiseLabel(d);
	const name = companyLabel(d);
	const pct = committedPct(d);
	// Website only when the company is disclosed: an anonymous raise sends no website.
	const website = d.company_website ? (/^https?:/i.test(d.company_website) ? d.company_website : `https://${d.company_website}`) : null;
	const sectorList = Array.isArray(sectors.data) ? sectors.data : (sectors.data?.data ?? []);
	const path = sectorPath(sectorList, d.sector);

	// Terms in one panel, label and value as on the company page (5.3); the
	// progress bar sits under Target and Committed.
	const terms: [string, string][] = [
		['Round', roundLabel(d.round_type) ?? '—'],
		['Target', money(d.target_amount, d.currency_code) ?? '—'],
		['Committed', money(d.committed_amount, d.currency_code) ?? '—'],
		['Valuation', valuationLabel(d)],
		['Instrument', instrumentLabel(d.instrument) ?? '—'],
		['Target close', closeLabel(d.target_close_date) ?? '—'],
		// The lead investor's name is withheld with the company name, so fall back
		// to the status, which is never redacted.
		['Lead', d.lead_investor ?? leadLabel(d.lead_status) ?? '—'],
	];
	const summary = d.member_perspective?.trim();
	const description = d.company_description?.trim();

	const requestIntro = async () => {
		setBusy(true);
		try {
			const res = await apiRequest('POST', `/api/scout/dealflow/${d.id}/interest`, {
				kind: 'introduction',
				note: note.trim() || null,
			});
			if (!res.ok) throw new Error(String(res.status));
			toast.success('Introduction requested.');
			setOpen(false); setNote('');
			void mutate();
		} catch {
			toast.error("Couldn't send your request. Please try again.");
		} finally { setBusy(false); }
	};

	return (
		<article className="atlas-co scout-raise-page">
			<header className="atlas-co__head">
				<div className="atlas-co__id">
					{/* `company_website` is null for an anonymous raise, so the logo falls
					    back to initials rather than fetching a favicon that would name it. */}
					<Logo co={{ name, website: d.company_website, custom_logo_url: null }} size={72} radius={10} />
					<div>
						<div className="scout-raise-page__label">{label}</div>
						<h1 className="atlas-co__name">
							{name}
							{!isCircle && <span style={{ marginLeft: 6, display: 'inline-flex', verticalAlign: 'middle' }} title="Verified by SportsTechX"><VerifiedBadge size={20} /></span>}
						</h1>
						{website && (
							<div className="atlas-co__socials">
								<a href={website} target="_blank" rel="noopener noreferrer" className="atlas-co__social" aria-label="Website" title="Website"><Globe size={15} aria-hidden="true" /></a>
							</div>
						)}
					</div>
				</div>
				{/* Save · Request introduction (primary) · Back to results, in the company page's row (5.2). */}
				<div className="atlas-co__actions">
					<RaiseBookmark d={d} variant="action" />
					<button
						type="button"
						className={cx('scout-df-pill', !d.interest_status && 'scout-df-pill--primary')}
						disabled={!!d.interest_status}
						onClick={() => setOpen(true)}
					>
						{d.interest_status ? INTEREST_LABEL[d.interest_status] ?? 'Requested' : 'Request introduction'}
					</button>
					<Action icon={<ArrowUpLeft />} href={backHref} onClick={back}>Back to results</Action>
				</div>
			</header>

			{d.interest_status && (
				<div className="scout-dd-sent">{statusLine(d.interest_status, d.disclosed)}</div>
			)}

			<section className="atlas-card atlas-co__facts scout-raise-page__terms" aria-label="Terms of the raise">
				{terms.map(([k, v]) => (
					<div key={k}>
						<div className="atlas-co__fact-k">{k}</div>
						<div className="atlas-co__fact-v">{v}</div>
						{k === 'Committed' && pct !== null && <div className="scout-df-bar scout-raise-page__bar"><Progress pct={pct} /></div>}
					</div>
				))}
				<div className="atlas-co__fact--wide">
					<div className="atlas-co__fact-k">Sector</div>
					<div className="atlas-co__fact-v">
						<SectorPath path={path} fallback={d.sector} listHref={(f) => `${hrefOf('companies')}?${new URLSearchParams(f as Record<string, string>).toString()}`} />
					</div>
				</div>
				{d.company_hq && (
					<div>
						<div className="atlas-co__fact-k">Headquarters</div>
						<div className="atlas-co__fact-v">{d.company_hq}</div>
					</div>
				)}
			</section>

			{/* Only sections with content show (5.6). */}
			<div className="scout-dd-grid">
				<div className="scout-dd-col">
					{summary && (
						<section className="scout-dd-box scout-dd-box--summary">
							<h2 className="scout-dd-box__h">{isCircle ? `Shared by ${submitterLabel(d)}` : 'SportsTechX summary'}</h2>
							<p className="scout-dd-box__lead">{summary}</p>
							{/* Returned even for an anonymous submitter — it is their view of
							    the raise, not their identity. */}
							{isCircle && d.member_relationship && (
								<p className="scout-dd-box__fine">
									Their relationship: {relationshipLabel(d.member_relationship)}
									{d.member_commitment ? ` · committing ${money(d.member_commitment, d.currency_code)}` : ''}
								</p>
							)}
						</section>
					)}
					{description && (
						<section className="scout-dd-box">
							<h2 className="scout-dd-box__h">Company</h2>
							<p className="scout-dd-box__text">{description}</p>
						</section>
					)}
				</div>
				<div className="scout-dd-col">
					<Documents d={d} />
					{/* Only when the raise is linked to an Atlas company AND the company is
					    not being withheld — `company_id` is redacted alongside the name. */}
					{d.company_id && (
						<Link href={`${hrefOf('companies')}/${d.company_id}`} className="scout-df-card__link">
							View company profile →
						</Link>
					)}
					{d.company_id && <FundingHistory companyId={d.company_id} />}
				</div>
			</div>

			{open && (
				<div className="scout-modal" role="presentation" onClick={() => setOpen(false)}>
					<div className="scout-dd-modal" role="dialog" aria-modal="true" aria-labelledby="intro-title" onClick={(e) => e.stopPropagation()}>
						<div className="scout-dd-modal__head">
							<h2 id="intro-title" className="scout-dd-modal__title">Request an introduction to {name}?</h2>
							<button type="button" className="scout-dd-modal__x" aria-label="Close" onClick={() => setOpen(false)}><X size={14} /></button>
						</div>
						{/* The approved flow (2.3): SportsTechX reviews, then asks the founder. */}
						<p className="scout-dd-modal__sub">SportsTechX reviews your request, then asks the founder. If they accept, Atlas introduces you by email.</p>
						<label className="scout-dd-modal__field">
							<span>A note for the founder<em> · Optional</em></span>
							<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Why you're interested in this raise" />
						</label>
						<div className="scout-dd-modal__actions">
							<button type="button" className="scout-df-pill scout-df-pill--primary" disabled={busy} onClick={() => void requestIntro()}>
								{busy ? 'Sending…' : 'Request introduction'}
							</button>
							<button type="button" className="scout-df-pill" onClick={() => setOpen(false)}>Cancel</button>
						</div>
					</div>
				</div>
			)}
		</article>
	);
}

/** One line under the header saying where the introduction stands (2.3). */
function statusLine(status: string, disclosed: boolean): string {
	if (disclosed || status === 'connected') return 'Introduced. Atlas has introduced you to the founder by email.';
	if (status === 'declined') return 'Not right now. This introduction won\u2019t go ahead this time.';
	if (status === 'no_response') return 'No response. The founder didn\u2019t answer within 7 working days, so the request has closed.';
	if (status === 'source_confirmed' || status === 'shared') return 'With the founder. SportsTechX has passed your request on.';
	return 'Requested. SportsTechX is reviewing your request before asking the founder.';
}

interface SectorRef { id: string; name: string; slug: string; parent_id?: string | null }

/** The sector chain for a raise's sector name, top first; empty when it isn't in the taxonomy. */
function sectorPath(list: SectorRef[], name: string | null): SectorRef[] {
	if (!name) return [];
	const byId = new Map(list.map((x) => [x.id, x]));
	let cur = list.find((x) => x.name?.toLowerCase() === name.toLowerCase()) ?? null;
	const chain: SectorRef[] = [];
	while (cur) { chain.unshift(cur); cur = cur.parent_id ? byId.get(cur.parent_id) ?? null : null; }
	return chain;
}

/**
 * The real documents panel.
 *
 * `has_deck` / `has_one_pager` tell us a file exists; `canOpenDocs` tells us
 * whether this viewer would actually be given it. Both are needed, because the
 * server answers the same 404 either way — so without the second check the UI
 * would offer a button that fails for a reason it cannot explain.
 *
 * The signed URL is fetched on click and never stored: it lasts four hours and
 * holding one in state would outlive the reason the viewer was allowed it.
 */
function Documents({ d }: { d: DealRow }) {
	const [busy, setBusy] = useState<string | null>(null);
	const allowed = canOpenDocs(d);
	const docs: [label: string, present: boolean, path: string][] = [
		['Pitch deck', d.has_deck, 'deck-url'],
		['One-pager', d.has_one_pager, 'one-pager-url'],
	];
	const present = docs.filter(([, p]) => p);

	const openDoc = async (slug: string) => {
		setBusy(slug);
		try {
			const res = await apiRequest('GET', `/api/scout/dealflow/${d.id}/${slug}`);
			if (!res.ok) throw new Error(String(res.status));
			const { url } = (await res.json()) as { url: string };
			window.open(url, '_blank', 'noopener,noreferrer');
		} catch {
			toast.error('That document isn’t available to you yet.');
		} finally { setBusy(null); }
	};

	return (
		<section className="scout-dd-box scout-dd-box--docs">
			<h2 className="scout-dd-box__h">Documents</h2>
			{present.length === 0 ? (
				<p className="scout-dd-box__text">No materials have been shared for this deal.</p>
			) : (
				present.map(([label, , slug]) => (
					<div key={label} className="scout-dd-doc">
						<div>
							<div className="scout-dd-doc__name">{label}</div>
							<div className="scout-dd-doc__meta">{allowed ? 'PDF' : 'Available after introduction'}</div>
						</div>
						{allowed ? (
							<button type="button" className="scout-dd-doc__open" disabled={busy === slug} onClick={() => void openDoc(slug)}>
								{busy === slug ? 'Opening…' : 'Open'}
							</button>
						) : <span className="scout-dd-doc__open" aria-disabled="true">Locked</span>}
					</div>
				))
			)}
			<p className="scout-dd-box__fine">
				{allowed
					? 'Shared where authorised by the company.'
					: 'Materials are released once SportsTechX has confirmed with the company.'}
			</p>
		</section>
	);
}

/**
 * The linked company's earlier rounds (5.5), as on its profile. Only for a raise whose
 * company is disclosed: `company_id` is withheld with the name, so an anonymous raise has none.
 */
function FundingHistory({ companyId }: { companyId: string }) {
	const { data, isLoading } = useSWR<{ data: Deal[] }>(qk.deals.list({ company_id: companyId, limit: 30, sort: '-announced_date' }));
	if (isLoading) return null;
	const rows = data?.data ?? [];
	return (
		<section className="scout-dd-box">
			<h2 className="scout-dd-box__h">Funding history</h2>
			{rows.length === 0 ? <p className="scout-dd-box__text">No disclosed rounds on record.</p> : (
				<ul className="scout-dd-box__text" style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
					{rows.map((r) => (
						<li key={r.id}>
							{fmtMonth(r.announced_date)} · {r.round_type_name ?? 'Round'} · {r.amount_usd == null ? 'Undisclosed' : fmtUsd(Number(r.amount_usd), yearOf(r.announced_date))}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
