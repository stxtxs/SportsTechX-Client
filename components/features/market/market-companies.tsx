'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, X } from 'lucide-react';
import { mutate as mutateSWR } from 'swr';
import { toast } from 'sonner';
import { useUrlSync, useUrlReader, useUrlModal } from '@/hooks/use-url-state';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { CompanyListItem as Company } from '@/types/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Button, Loading, Empty, FilterBar, type FilterDef, Logo, Flag, Pager, ViewToggle, type ViewMode, lockedFiltersNote } from '@/components/atlas';
import { RefreshList, useRecommendedWindow } from '@/components/features/recommended/recommended-window';
import { apiRequest } from '@/lib/query-client';
import { hrefOf } from '@/lib/routes';
import { ExportButton } from '@/components/features/exports/export-button';
import { StagePill, type StageOption } from '@/components/features/watchlists/stage-pill';
import { BUSINESS_MODELS, FUNDING_BUCKETS, SINCE_YEARS } from '@/lib/catalog-options';
import { useSectorTierData, useSportOptions, useLocationFacetOptions, useTechTagOptions, useCountryOptions } from '@/hooks/use-catalog-options';
import { fmtUsd } from './format';
import { SectorMark, StatusMarks } from './company-marks';
import { SaveToWatchlist } from '@/components/features/watchlists/save-to-watchlist';
import { useSavedCompanyIds } from '@/components/features/watchlists/use-company-watchlists';
import { useCanSeeFundraising } from '@/hooks/use-user-profile';
import { ResultCapNote } from './result-cap-note';
import dynamic from 'next/dynamic';
// ~650 lines (plus the watchlist picker and drawer primitive it pulls in) for a
// panel that only opens on a row click, and only in the drawer variant.
const CompanyDrawer = dynamic(() => import('@/components/ui/company-drawer').then((m) => m.CompanyDrawer), { ssr: false });
import './company-drawer-atlas.css';
import { useFeatureAccess } from '@/contexts/feature-access-context';
import './market.css';



const PAGE_SIZE = 24;
const COMPANY_SORTS: [string, string][] = [['-created_at', 'Newest'], ['name', 'Name A–Z'], ['-total_funding', 'Most funded']];
/** Recommended adds "Best match" first, its default (preview fixes 1.2). */
const REC_SORTS: [string, string][] = [['match', 'Best match'], ...COMPANY_SORTS];
/** Fixed widths, the same in both views (1.3): Match, then the row actions. */
const MATCH_W = 64;
const STAGE_W = 140;
const ACTIONS_W = 68;

/** A recommendation from `GET /api/scout/recommended`: the server's match per company. */
interface Recommendation {
	id: string;
	name: string;
	match_sector: boolean;
	match_geo: boolean;
	match_stage: boolean;
	match_cheque: boolean;
	/** 0-100 from the server, when it grades the match. */
	match_score?: number | null;
}
const matchPct = (r: Recommendation) =>
	r.match_score ?? Math.round(([r.match_sector, r.match_geo, r.match_stage, r.match_cheque].filter(Boolean).length / 4) * 100);
// A faint em-dash for empty cells, so real values stand out against the many gaps.
const DASH = <span className="atlas-dash">—</span>;

/**
 * Market → Companies. The full sports tech company database — the same search +
 * filter set as before, now rendered as list rows (per the design) with a slide-
 * over detail drawer.
 */
/** `companyHref` → rows link to a company profile page; omitted → rows open the side drawer. */
export function MarketCompanies({ companyHref, modeSwitch, recommended = false }: {
	companyHref?: (idOrSlug: string) => string;
	/** "Recommended / All", on the count line next to the count (preview fixes 1.5). */
	modeSwitch?: ReactNode;
	/**
	 * Recommended: the same list, limited to the companies recommended to this
	 * Scout (preview fixes 1.1-1.7). Same bar, table, columns and widths; Match
	 * and "Not relevant" are the only additions.
	 */
	recommended?: boolean;
} = {}) {
	// View-state lives in the URL so Back/Forward restore it (a profile visit
	// unmounts this list; the URL is all the browser keeps) and so the page is
	// shareable. Deep links (framework/Scout) can preselect ?q=, ?sector= etc.
	const url = useUrlReader();
	// List is the default for every database; a chosen view lives in the URL
	// with the filters, so it survives Back/Forward, links and any remount.
	const [view, setView] = useState<ViewMode>(() => url.oneOf('view', ['table', 'cards'] as const, 'table'));
	const [q, setQ] = useState(() => url.str('q'));
	const dq = useDebouncedValue(q);
	const [model, setModel] = useState(() => url.oneOf('model', BUSINESS_MODELS.map(([v]) => v), ''));
	const [sector, setSector] = useState(() => url.str('sector'));
	const [subSector, setSubSector] = useState(() => url.str('sub'));
	const [subSubSector, setSubSubSector] = useState(() => url.str('subsub'));
	const [sport, setSport] = useState(() => url.str('sport'));
	const [country, setCountry] = useState(() => url.str('country'));
	const [city, setCity] = useState(() => url.str('city'));
	const [continent, setContinent] = useState(() => url.str('continent'));
	const [region, setRegion] = useState(() => url.str('region'));
	const [techTag, setTechTag] = useState(() => url.str('tech'));
	const [funding, setFunding] = useState(() => url.str('funding'));
	const [founded, setFounded] = useState(() => url.str('founded'));
	const [verified, setVerified] = useState(() => url.bool('verified'));
	const [raising, setRaising] = useState(() => url.bool('raising'));
	const [unicorn, setUnicorn] = useState(() => url.bool('unicorn'));
	const sorts = recommended ? REC_SORTS : COMPANY_SORTS;
	const defaultSort = recommended ? 'match' : '-created_at';
	const [sort, setSort] = useState(() => url.oneOf('sort', sorts.map(([v]) => v), defaultSort));
	const [page, setPage] = useState(() => url.num('page', 1));
	// The detail drawer is addressable: ?company=<slug> reopens it on load. The
	// slug is format-validated (useUrlModal's default), so a junk param won't fire
	// a fetch or open an empty drawer.
	const [openId, setOpenId] = useUrlModal('company');
	// Fundraising is a Scout-only signal (useCanSeeFundraising); the $ column
	// slot only exists for them. Saved state for every row in one lookup.
	const canSeeRaising = useCanSeeFundraising();
	const savedIds = useSavedCompanyIds();
	const reset = () => setPage(1);

	// Mirror the whole view-state into the URL (defaults omitted to keep it short).
	useUrlSync({
		view: view !== 'table' ? view : undefined,
		q: dq, model, sector, sub: subSector, subsub: subSubSector, sport, country,
		city, continent, region, tech: techTag, funding, founded,
		verified, raising, unicorn,
		sort: sort !== defaultSort ? sort : undefined,
		page: page > 1 ? page : undefined,
	});
	// Filter option lists load when the filter menu first opens, not with the
	// page: four reference calls the list itself never needs. Each still loads
	// up front when the URL already uses it, so its applied chip has a label.
	const [optionsWanted, setOptionsWanted] = useState(false);
	const wantOptions = useCallback(() => setOptionsWanted(true), []);
	const sectors = useSectorTierData(optionsWanted || !!(sector || subSector || subSubSector));
	const sportOptions = useSportOptions(optionsWanted || !!sport);
	const countryOptions = useCountryOptions(optionsWanted || !!country);
	const techTags = useTechTagOptions(optionsWanted || !!techTag);
	const adv = useFeatureAccess('advanced_filters');
	const loc = useLocationFacetOptions(adv.hasAccess && (optionsWanted || !!(city || continent || region)));

	// Recommended: the recommended companies and their match, from the Scout endpoint.
	const rec = useSWR<{ data: Recommendation[] }>(recommended ? qk.scout.recommended({ limit: 50 }) : null);
	const recRows = useMemo(() => rec.data?.data ?? [], [rec.data]);
	const recIds = useMemo(() => recRows.map((r) => r.id), [recRows]);
	const scoreById = useMemo(() => new Map(recRows.map((r) => [r.id, matchPct(r)])), [recRows]);
	const recNeedsSetup = (rec.error as { code?: string } | undefined)?.code === 'SCOUT_NOT_SET_UP';

	const params = useMemo(() => {
		// Recommended filters within its own companies: all of them in one page,
		// windowed below; "Best match" is ordered here, by name on the server.
		const p: Record<string, unknown> = recommended
			? { page: 1, limit: 50, sort: sort === 'match' ? 'name' : sort, ids: recIds.join(',') }
			: { page, limit: PAGE_SIZE, sort };
		const term = dq.trim().slice(0, 120);
		if (term) p.q = term;
		if (model) p.business_model = model;
		const secSlug = sectors.sectorSlug(sector, adv.hasAccess ? subSector : '', adv.hasAccess ? subSubSector : '');
		if (secSlug) p.sector_slug = secSlug;
		if (sport) p.sport_id = sport;
		if (country) p.country = country;
		if (funding) p.min_funding = funding;
		if (founded) p.founded_year_min = founded;
		if (verified) p.is_verified = true;
		// Scout only; a stale ?raising=1 from another plan is ignored.
		if (raising && canSeeRaising) p.is_actively_raising = true;
		if (unicorn) p.is_unicorn = true;
		if (adv.hasAccess) {
			if (city) p.city = city;
			if (continent) p.continent = continent;
			if (region) p.region = region;
			if (techTag) p.tech_tag_slug = techTag;
		}
		return p;
	}, [page, sort, dq, model, sectors, sector, subSector, subSubSector, sport, country, funding, founded, verified, raising, canSeeRaising, unicorn, adv.hasAccess, city, continent, region, techTag, recommended, recIds]);

	// Two inputs to `params` resolve asynchronously, and each can add a key to
	// the query once it lands: the sector hierarchy (which turns a `?sector=`
	// into a `sector_slug`) and the entitlement check (which lets the advanced
	// `?sub=`/`?subsub=`/location params in at all). Firing before they settle
	// means one request without the filter and a second with it.
	//
	// Only wait on each when it can actually change the key. With no such
	// filter selected the params are value-identical either way — SWR hashes
	// array keys structurally — so the common arrival is not delayed at all,
	// and a hung reference fetch can never strand the list behind a spinner.
	const needsSectors = !!(sector || subSector || subSubSector);
	const needsAdv = !!(subSector || subSubSector || city || continent || region || techTag);
	const filtersReady = (!needsSectors || sectors.ready) && (!needsAdv || !adv.isLoading);
	const all = useSWR<{ data: Company[]; total: number; totalPages: number; cap?: number }>(
		filtersReady && (!recommended || recIds.length > 0) ? qk.companies.list(params) : null,
		{ keepPreviousData: true },
	);
	const listed = useMemo(() => all.data?.data ?? [], [all.data]);
	const total = all.data?.total ?? 0;
	// Recommended shows 10 at a time from the filtered recommendations; saved
	// ones leave the queue (handover v1 A7). Best match orders by match %.
	const recSorted = useMemo(() => {
		if (!recommended) return listed;
		const inRec = listed.filter((c) => scoreById.has(c.id));
		return sort === 'match'
			? [...inRec].sort((a, b) => (scoreById.get(b.id) ?? 0) - (scoreById.get(a.id) ?? 0) || a.name.localeCompare(b.name))
			: inRec;
	}, [recommended, listed, scoreById, sort]);
	const win = useRecommendedWindow(recSorted, savedIds, 'scout-companies', true);
	const rows = recommended ? win.page : listed;

	// "Not relevant" (Recommended): dismissed server-side, with Undo.
	const [lastDismissed, setLastDismissed] = useState<{ id: string; name: string } | null>(null);
	const refreshRec = () => mutateSWR((k: unknown) => Array.isArray(k) && typeof k[0] === 'string' && k[0].startsWith('/api/scout/recommended'));
	const dismiss = async (id: string, name: string) => {
		try {
			await apiRequest('POST', `/api/scout/recommended/${id}/dismiss`);
			setLastDismissed({ id, name });
			void refreshRec();
		} catch { toast.error("Couldn't mark that company not relevant. Please try again."); }
	};
	const undoDismiss = async () => {
		if (!lastDismissed) return;
		try {
			await apiRequest('DELETE', `/api/scout/recommended/${lastDismissed.id}/dismiss`);
			setLastDismissed(null);
			void refreshRec();
		} catch { toast.error("Couldn't undo. Please try again."); }
	};

	const anyFilter = !!(dq || model || sector || subSector || subSubSector || sport || country || city || continent || region || techTag || funding || founded || verified || raising || unicorn);
	const clearAll = () => { setQ(''); setModel(''); setSector(''); setSubSector(''); setSubSubSector(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setTechTag(''); setFunding(''); setFounded(''); setVerified(false); setRaising(false); setUnicorn(false); setSort(defaultSort); setPage(1); };
	// Filter defs for the toolbar — each change resets to page 1, as before.
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	return (
		<>
			{lastDismissed && (
				<div className="scout-undo">
					<span>{lastDismissed.name} marked not relevant.</span>
					<button type="button" className="scout-link" onClick={() => void undoDismiss()}>Undo</button>
				</div>
			)}
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: recommended ? 'Search recommended companies' : 'Search companies' }}
				groups={[
					{ label: 'Industry & domain', filters: [
						sel('sector', 'Sector', sector, sectors.topOptions, setSector),
						...(adv.hasAccess ? [
							sel('subSector', 'Sub-sector', subSector, sectors.subOptions, setSubSector),
							sel('subSubSector', 'Sub-sub-sector', subSubSector, sectors.subSubOptions, setSubSubSector),
							sel('techTag', 'Tech tag', techTag, techTags, setTechTag),
						] : []),
						sel('sport', 'Sport', sport, sportOptions, setSport),
					] },
					{ label: 'Geography & location', filters: [
						sel('country', 'Country', country, countryOptions, setCountry),
						...(adv.hasAccess ? [
							sel('continent', 'Continent', continent, loc.continent, setContinent),
							sel('region', 'Region', region, loc.region, setRegion),
							sel('city', 'City', city, loc.city, setCity),
						] : []),
					] },
					{ label: 'Profile & funding', filters: [
						sel('model', 'Business model', model, BUSINESS_MODELS, setModel),
						sel('funding', 'Funding', funding, FUNDING_BUCKETS, setFunding),
						sel('founded', 'Founded', founded, SINCE_YEARS, setFounded),
					] },
					{ label: 'Status', filters: [
						tog('verified', 'Verified', verified, setVerified),
						...(canSeeRaising ? [tog('raising', 'Raising now', raising, setRaising)] : []),
						tog('unicorn', 'Unicorn', unicorn, setUnicorn),
					] },
					...(adv.isLocked ? [{ label: 'Advanced', filters: [], locked: lockedFiltersNote(adv.requiredTier) }] : []),
				]}
				sort={{ value: sort, options: sorts, onChange: (v) => { setSort(v); reset(); } }}
				onMenuOpen={wantOptions}
				canClear={anyFilter}
				onClear={clearAll}
			/>

			{/* `!filtersReady` counts as loading: the key is still null then, so
			    SWR reports isLoading=false and this would fall through to
			    "No companies match your filters" before the first request. */}
			{(all.isLoading || !filtersReady || (recommended && rec.isLoading)) && rows.length === 0 ? <Loading />
				: recommended && (recNeedsSetup || recIds.length === 0) ? (
					<Empty>No recommendations yet. Finish your preferences to see matches.{' '}<Button size="sm" href={hrefOf('interests')}>Edit preferences</Button></Empty>
				)
				: rows.length === 0 ? <Empty>No results for these filters. Remove one, or clear them all.</Empty>
					: (
						<div className="atlas-card atlas-chart-card" style={{ marginTop: 10 }}>
							{/* One count line for both views; the switch sits next to the count (1.5). */}
							<div className="atlas-chart-card__head mkt-countline">
								<span className="mkt-countline__left">
									<span>{recommended
										? `${rows.length} of ${recSorted.length} recommended`
										: `${total.toLocaleString()} compan${total === 1 ? 'y' : 'ies'}`}</span>
									{modeSwitch}
								</span>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ViewToggle value={view} onChange={setView} /><ExportButton entity="companies" search={dq} params={params} /></div>
							</div>
							{view === 'cards'
								? <div className="mkt-list">{rows.map((c) => <CompanyRow key={c.id} c={c} href={companyHref?.(c.slug ?? c.id)} onOpen={() => setOpenId(c.slug ?? c.id)} saved={savedIds.has(c.id)} canSeeRaising={canSeeRaising} />)}</div>
								: (
								<CompanyTable
									rows={rows}
									hrefFor={(c) => companyHref?.(c.slug ?? c.id)}
									onOpen={(c) => setOpenId(c.slug ?? c.id)}
									savedIds={savedIds}
									canSeeRaising={canSeeRaising}
									fundingSort={{ active: sort === '-total_funding', onToggle: () => { setSort(sort === '-total_funding' ? defaultSort : '-total_funding'); reset(); } }}
									match={recommended ? scoreById : undefined}
									onDismiss={recommended ? (c) => void dismiss(c.id, c.name) : undefined}
								/>
								)}
						</div>
					)}

			{recommended
				? win.canRefresh && <RefreshList onRefresh={win.refresh} />
				: <>
					<ResultCapNote cap={all.data?.cap} total={total} noun="companies" />
					<Pager page={page} totalPages={all.data?.totalPages ?? 1} onPage={setPage} />
				</>}

			{!companyHref && <CompanyDrawer idOrSlug={openId} onClose={() => setOpenId(null)} />}
		</>
	);
}

/**
 * Tile view, in step with the list: name with its status icons, flag + city,
 * what it does, Sector icon + sub-category, and funding. One quiet "View company" pill; the whole tile
 * is the link (the pill's ::after covers it), as on Home's cards.
 */
function CompanyRow({ c, href, onOpen, saved, canSeeRaising }: { c: Company; href?: string; onOpen: () => void; saved: boolean; canSeeRaising: boolean }) {
	const hq = [c.hq_city, c.hq_country].filter(Boolean).join(', ');
	const funding = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
	return (
		<div className="mkt-co mkt-co--tile">
			<div className="mkt-co-save"><SaveToWatchlist companyId={c.id} companyName={c.name} compact saved={saved} /></div>
			<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={72} radius={9} />
			<div className="mkt-co-body">
				<div className="mkt-co-head">
					<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
						{href ? <Link href={href} className="mkt-co-name mkt-co-name--link">{c.name}</Link> : <span className="mkt-co-name">{c.name}</span>}
						<StatusMarks verified={c.is_verified} raising={canSeeRaising && c.is_actively_raising} inline />
					</span>
					{(c.hq_country || c.hq_city) && (
						<span className="mkt-co-meta" title={hq}>
							<span className="mkt-flag has-tip" data-tip={c.hq_country ?? undefined}><Flag cc={c.hq_country} size={11} /></span>{c.hq_city || c.hq_country}
						</span>
					)}
				</div>
				{c.description && <div className="mkt-co-desc">{c.description}</div>}
				<div className="mkt-tags">
					{c.primary_sector && <span className="mkt-tag mkt-icontext"><SectorMark slug={c.primary_sector_slug} />{c.primary_sector}</span>}
					{funding !== '—' && <span className="mkt-tag">{funding} raised</span>}
				</div>
			</div>
			<div className="mkt-co-actions">
				{href
					? <Link href={href} className="mkt-co-view">View company <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden="true" /></Link>
					: <button type="button" className="mkt-co-view" onClick={onOpen}>View company <ArrowUpRight size={12} strokeWidth={1.75} aria-hidden="true" /></button>}
			</div>
		</div>
	);
}

/**
 * The master companies table (handover v1 §4), shared by Companies, its
 * Recommended view and every watchlist (preview fixes 1.1-1.7, 2.5). Company,
 * status marks, Sector (icon + name), Location (flag + city), Funding, Match,
 * then the row actions. Every column but Company has a fixed width, and Match
 * and the actions keep their space even when empty, so switching views never
 * moves a column.
 */
export function CompanyTable({ rows, hrefFor, onOpen, savedIds, canSeeRaising, fundingSort, match, onDismiss, onRemove, stage }: {
	rows: Company[];
	hrefFor: (c: Company) => string | undefined;
	onOpen?: (c: Company) => void;
	savedIds: Set<string>;
	canSeeRaising: boolean;
	/** Funding header sorts the list, when the list can sort. */
	fundingSort?: { active: boolean; onToggle: () => void };
	/** Recommended: match % per company id. */
	match?: Map<string, number>;
	/** Recommended: "Not relevant". */
	onDismiss?: (c: Company) => void;
	/** A watchlist: remove from this list. */
	onRemove?: (c: Company) => void;
	/** A watchlist: its Stage column after Company, a pill that changes the stage (2.13). */
	stage?: {
		valueOf: (c: Company) => string;
		options: StageOption[];
		onChange: (c: Company, key: string) => void;
		sort: { active: boolean; onToggle: () => void };
	};
}) {
	const statusWidth = canSeeRaising ? 48 : 26;
	return (
		<div className="atlas-table mkt-table" role="table">
			<div className="atlas-table__head">
				<span className="atlas-table__name">Company</span>
				{stage && (
					<span className="atlas-table__col" style={{ width: STAGE_W }}>
						<button type="button" className="mkt-sort" aria-pressed={stage.sort.active} onClick={stage.sort.onToggle}>Stage{stage.sort.active ? ' ↓' : ''}</button>
					</span>
				)}
				<span className="atlas-table__col" style={{ width: statusWidth }}><span className="sr-only">Status</span></span>
				<span className="atlas-table__col hide-sm mkt-sector">Sector</span>
				<span className="atlas-table__col hide-sm" style={{ width: 170 }}>Location</span>
				<span className="atlas-table__col" style={{ width: 96, textAlign: 'right' }}>
					{fundingSort ? (
						<button type="button" className="mkt-sort" aria-pressed={fundingSort.active} onClick={fundingSort.onToggle}>
							Funding{fundingSort.active ? ' ↓' : ''}
						</button>
					) : 'Funding'}
				</span>
				{/* Match: the one extra column, kept as empty space elsewhere so no column moves (1.3). */}
				<span className="atlas-table__col mkt-match" style={{ width: MATCH_W, textAlign: 'right' }}>{match ? 'Match' : ''}</span>
				<span className="atlas-table__col" style={{ width: ACTIONS_W }}><span className="sr-only">Actions</span></span>
			</div>
			{rows.map((c) => {
				const href = hrefFor(c);
				const hq = [c.hq_city, c.hq_country].filter(Boolean).join(', ');
				const funding = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
				const inner = <>
					<div className="atlas-table__name">
						<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={30} radius={6} />
						<div className="atlas-table__name-main">
							{/* The name is the row's link; its ::after covers the row, so the
							    whole row opens the company while the buttons stay their own. */}
							{href
								? <Link href={href} className="atlas-ellipsis mkt-row-link" style={{ fontWeight: 600, minWidth: 0 }}>{c.name}</Link>
								: <span className="atlas-ellipsis" style={{ fontWeight: 600, minWidth: 0 }}>{c.name}</span>}
						</div>
					</div>
					{stage && (
						<span className="atlas-table__col mkt-stage" style={{ width: STAGE_W }}>
							<StagePill value={stage.valueOf(c)} options={stage.options} onChange={(k) => stage.onChange(c, k)} ariaLabel={`Stage for ${c.name}`} />
						</span>
					)}
					<span className="atlas-table__col" style={{ width: statusWidth }}>
						<StatusMarks verified={c.is_verified} raising={canSeeRaising && c.is_actively_raising} showRaisingSlot={canSeeRaising} />
					</span>
					{/* Sector as its icon, then the name; a long one ends in an ellipsis, full on hover (1.6). */}
					<span className="atlas-table__col hide-sm mkt-icontext mkt-sector" title={c.primary_sector ?? undefined}>
						<SectorMark slug={c.primary_sector_slug} />
						<span className="atlas-ellipsis">{c.primary_sector ?? DASH}</span>
					</span>
					{/* Flag (country on hover) + city; the country name when there's no city. */}
					<span className="atlas-table__col hide-sm mkt-icontext" style={{ width: 170 }} title={hq || undefined}>
						{c.hq_country || c.hq_city
							? <><span className="mkt-flag has-tip" data-tip={c.hq_country ?? undefined}><Flag cc={c.hq_country} size={13} /></span><span className="atlas-ellipsis">{c.hq_city || c.hq_country}</span></>
							: DASH}
					</span>
					<span className="atlas-table__col" style={{ width: 96, textAlign: 'right', fontWeight: funding === '—' ? 400 : 600, color: funding === '—' ? undefined : 'var(--a-ink)' }}>{funding === '—' ? DASH : funding}</span>
					<span className="atlas-table__col mkt-match" style={{ width: MATCH_W, textAlign: 'right', fontWeight: 600, color: 'var(--a-ink)' }}>
						{match?.has(c.id) ? `${match.get(c.id)}%` : ''}
					</span>
					{/* Quiet icon buttons beside the bookmark: Not relevant (Recommended), Remove (a watchlist) (1.4). */}
					<span className="atlas-table__col mkt-save mkt-actions" style={{ width: ACTIONS_W }}>
						{onDismiss && (
							<button type="button" className="mkt-dismiss has-tip" data-tip="Not relevant" aria-label={`Not relevant: ${c.name}`} onClick={() => onDismiss(c)}>
								<X size={14} strokeWidth={1.75} aria-hidden="true" />
							</button>
						)}
						{onRemove && (
							<button type="button" className="mkt-dismiss has-tip" data-tip="Remove from this list" aria-label={`Remove ${c.name} from this list`} onClick={() => onRemove(c)}>
								<X size={14} strokeWidth={1.75} aria-hidden="true" />
							</button>
						)}
						<SaveToWatchlist companyId={c.id} companyName={c.name} compact saved={savedIds.has(c.id)} />
					</span>
				</>;
				return href
					? <div key={c.id} className="atlas-table__row mkt-row">{inner}</div>
					: <div key={c.id} className="atlas-table__row mkt-row" style={{ cursor: 'pointer' }} onClick={() => onOpen?.(c)}>{inner}</div>;
			})}
		</div>
	);
}
