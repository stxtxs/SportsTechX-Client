'use client';

import Link from 'next/link';
import { useState } from 'react';
import useSWR, { mutate } from 'swr';
import { ArrowUpRight, Check, Minus, X } from 'lucide-react';
import { Action, Button, Empty, Flag, Loading, Logo, ViewToggle, type ViewMode, cx } from '@/components/atlas';
import { RefreshList, useRecommendedWindow } from '@/components/features/recommended/recommended-window';
import { useSavedCompanyIds } from '@/components/features/watchlists/use-company-watchlists';
import '@/components/features/market/market.css';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import { apiRequest } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { companyHref, hrefOf } from '@/lib/routes';
import { fmtUsd } from '@/components/features/market/format';
import './recommended.css';

import { toast } from 'sonner';

/**
 * Discover → Recommended, from `GET /api/scout/recommended`.
 *
 * Companies scored against the investor's thesis. This rendered
 * `SAMPLE_COMPANIES` until now, with a comment claiming "no endpoint scores
 * companies against an investor thesis yet" — there is one, and it returns the
 * per-dimension flags the "Why it matches" chips need.
 *
 * Those flags matter: the server deliberately scores live rather than reading a
 * blended offline score, because *"a blended score cannot say which dimension
 * matched, and the chips claim exactly that"*. So each chip is backed by its
 * own boolean, not inferred from a total.
 *
 * "Not relevant" dismissals are persisted server-side via
 * `POST /api/scout/recommended/:companyId/dismiss` and excluded from the
 * recommended query.
 */
interface Recommendation {
	id: string;
	name: string;
	slug: string | null;
	description: string | null;
	website: string | null;
	custom_logo_url: string | null;
	sector: string | null;
	city: string | null;
	country: string | null;
	total_funding_usd: string | null;
	latest_round: string | null;
	match_sector: boolean;
	match_geo: boolean;
	match_stage: boolean;
	match_cheque: boolean;
	/** Matches what the Scout has been searching for / asking about, not the
	 *  declared thesis — shown as a distinct "from your activity" chip. */
	match_activity: boolean;
	match_count: number;
	/** 0–100 from the server: thesis points earned over points possible. */
	match_score?: number | null;
}

/** Only the four boolean dimensions — `keyof Recommendation` would widen to
 *  include `match_count` and the string fields. */
type MatchKey = 'match_sector' | 'match_geo' | 'match_stage' | 'match_cheque';
const CHIPS: [label: string, key: MatchKey][] = [
	['Sector', 'match_sector'],
	['Geography', 'match_geo'],
	['Stage', 'match_stage'],
	['Cheque', 'match_cheque'],
];

/**
 * Match as a percentage, as Raise shows it (fix list 17 Nov, 3.3): the share of
 * the four thesis dimensions this company matches. The raw "4/4" read the same
 * on every row because the list only holds companies matching all four. The
 * server's `match_score` grades each dimension (a sub-sector over a whole pillar,
 * a country over a continent), so it's used when present.
 */
const matchPct = (c: Recommendation) => c.match_score ?? Math.round((CHIPS.filter(([, k]) => c[k]).length / CHIPS.length) * 100);

const place = (c: Recommendation) => [c.city, c.country].filter(Boolean).join(', ');

export function Recommended() {
	const [view, setView] = useState<ViewMode>('table');
	// A pool to queue from; Recommended shows it 10 at a time, A to Z. 50 is
	// the endpoint's maximum `limit` (a larger one is a 400).
	const { data, isLoading, error } = useSWR<{ data: Recommendation[] }>(qk.scout.recommended({ limit: 50 }));
	const saved = useSavedCompanyIds();
	// Recommending against a thesis that does not exist is meaningless, so this
	// is the one Discover surface that stays gated — but "set yours up" is the
	// answer, not an error. Browsing and Signals work without one.
	const needsThesis = (error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';
	const [lastDismissed, setLastDismissed] = useState<{ id: string; name: string } | null>(null);

	const rows = data?.data ?? [];
	const win = useRecommendedWindow(rows, saved, 'scout-companies');

	const refresh = () => mutate((k: unknown) => Array.isArray(k) && typeof k[0] === 'string' && k[0].startsWith('/api/scout/recommended'));
	const dismiss = async (id: string, name: string) => {
		try {
			await apiRequest('POST', `/api/scout/recommended/${id}/dismiss`);
			setLastDismissed({ id, name });
			void refresh();
		} catch { toast.error("Couldn't dismiss that company. Please try again."); }
	};
	const undoDismiss = async () => {
		if (!lastDismissed) return;
		try {
			await apiRequest('DELETE', `/api/scout/recommended/${lastDismissed.id}/dismiss`);
			setLastDismissed(null);
			void refresh();
		} catch { toast.error("Couldn't undo. Please try again."); }
	};

	return (
		<>
			{lastDismissed && (
				<div className="scout-undo">
					<span>{lastDismissed.name} marked not relevant.</span>
					<button type="button" className="scout-link" onClick={() => void undoDismiss()}>Undo</button>
				</div>
			)}

			{isLoading ? <Loading />
				// A real failure says so; only "no thesis" or "no matches" is the
				// setup empty state.
				: error && !needsThesis ? <Empty>Couldn&apos;t load your recommendations. Please try again.</Empty>
				: needsThesis || rows.length === 0 ? (
					<Empty>No recommendations yet. Finish your setup to see matches.{' '}<Button size="sm" href={hrefOf('interests')}>Open Preferences</Button></Empty>
				)
				: (
				<div className="atlas-card atlas-chart-card" style={{ marginTop: 10 }}>
					<div className="atlas-dt__top">
						<span>Matched to your preferences · {win.page.length} of {rows.length}</span>
						<div><ViewToggle value={view} onChange={setView} /><Button href={hrefOf('interests')} variant="outline" size="sm">Edit preferences</Button></div>
					</div>
					{view === 'cards' ? (
					<div className="atlas-rec-list" style={{ padding: 20 }}>
						{win.page.map((c) => (
							<article key={c.id} className="atlas-rec">
								<div className="atlas-rec__top">
									<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={72} radius={9} />
									<div className="atlas-rec__id">
										<div className="atlas-rec__line">
											<Link href={companyHref(c.slug ?? c.id)} className="atlas-rec__name">{c.name}</Link>
											{place(c) && <span className="atlas-rec__meta">{place(c)}</span>}
										</div>
										{c.description && <p className="atlas-rec__desc">{c.description}</p>}
										<div className="atlas-rec__facts">
											{c.sector && <span className="atlas-rec__chip">{c.sector}</span>}
											<span className="atlas-rec__raised">
												{c.total_funding_usd != null ? `${fmtUsd(Number(c.total_funding_usd))} raised` : 'Undisclosed'}
												{c.latest_round ? ` · ${c.latest_round}` : ''}
											</span>
										</div>
									</div>
								</div>

								<div className="atlas-rec__why">
									<div className="atlas-rec__whyhead">
										<span className="atlas-rec__whylabel">Why it matches</span>
										{CHIPS.map(([label, key]) => (
											<span key={label} className={cx('atlas-rec__check', c[key] && 'on')}>
												{c[key] ? <Check size={11} strokeWidth={2.25} aria-hidden="true" /> : <Minus size={11} strokeWidth={2} aria-hidden="true" />}
												{label}
											</span>
										))}
										{c.match_activity && (
											<span className="atlas-rec__check on atlas-rec__check--activity">
												<Check size={11} strokeWidth={2.25} aria-hidden="true" />From your activity
											</span>
										)}
									</div>
								</div>

								<div className="atlas-rec__actions">
									{/* One "Not relevant" style everywhere (handover v1 A7). */}
									<Action icon={<X />} onClick={() => void dismiss(c.id, c.name)}>Not relevant</Action>
									<SaveToWatchlist companyId={c.id} companyName={c.name} />
									<Action icon={<ArrowUpRight />} href={companyHref(c.slug ?? c.id)}>View company</Action>
								</div>
							</article>
						))}
					</div>
					) : (
					<div className="atlas-table mkt-table" role="table">
						<div className="atlas-table__head">
							<span className="atlas-table__name">Company</span>
							<span className="atlas-table__col hide-sm mkt-sector">Sector</span>
							<span className="atlas-table__col hide-sm" style={{ width: 170 }}>Location</span>
							<span className="atlas-table__col" style={{ width: 96, textAlign: 'right' }}>Funding</span>
							<span className="atlas-table__col" style={{ width: 60, textAlign: 'right' }}>Match</span>
							<span className="atlas-table__col" style={{ width: 120 }}><span className="sr-only">Not relevant</span></span>
							<span className="atlas-table__col" style={{ width: 32 }}><span className="sr-only">Save</span></span>
						</div>
						{win.page.map((c) => {
							const funding = c.total_funding_usd != null ? fmtUsd(Number(c.total_funding_usd)) : null;
							return (
								<div key={c.id} className="atlas-table__row mkt-row">
									<div className="atlas-table__name">
										<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={30} radius={6} />
										<div className="atlas-table__name-main">
											<Link href={companyHref(c.slug ?? c.id)} className="atlas-ellipsis mkt-row-link" style={{ fontWeight: 600, minWidth: 0 }}>{c.name}</Link>
										</div>
									</div>
									<span className="atlas-table__col hide-sm mkt-sector atlas-ellipsis">{c.sector ?? '—'}</span>
									<span className="atlas-table__col hide-sm mkt-icontext" style={{ width: 170 }} title={place(c) || undefined}>
										{c.country || c.city ? <>{c.country && <span className="mkt-flag"><Flag cc={c.country} size={13} /></span>}<span className="atlas-ellipsis">{c.city || c.country}</span></> : '—'}
									</span>
									<span className="atlas-table__col" style={{ width: 96, textAlign: 'right', fontWeight: funding ? 600 : 400, color: funding ? 'var(--a-ink)' : undefined }}>{funding ?? '—'}</span>
									<span className="atlas-table__col" style={{ width: 60, textAlign: 'right', fontWeight: 600, color: 'var(--a-ink)' }}>{matchPct(c)}%</span>
									<span className="atlas-table__col mkt-save" style={{ width: 120 }}><Action icon={<X />} onClick={() => void dismiss(c.id, c.name)}>Not relevant</Action></span>
									<span className="atlas-table__col mkt-save" style={{ width: 32 }}>
										<SaveToWatchlist companyId={c.id} companyName={c.name} compact saved={saved.has(c.id)} />
									</span>
								</div>
							);
						})}
					</div>
					)}
					{win.canRefresh && <RefreshList onRefresh={win.refresh} />}
				</div>
				)}
		</>
	);
}
