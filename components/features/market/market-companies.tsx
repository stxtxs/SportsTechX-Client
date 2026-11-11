'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { useUrlSync, useUrlReader, useUrlModal } from '@/hooks/use-url-state';
import useSWR from 'swr';
import { qk } from '@/lib/query-keys';
import type { CompanyListItem as Company } from '@/types/api';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { Loading, Empty, FilterBar, type FilterDef, Logo, Flag, Pager, ViewToggle, type ViewMode, lockedFiltersNote } from '@/components/atlas';
import { ExportButton } from '@/components/features/exports/export-button';
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
// A faint em-dash for empty cells, so real values stand out against the many gaps.
const DASH = <span className="atlas-dash">—</span>;

/**
 * Market → Companies. The full sports-tech company database — the same search +
 * filter set as before, now rendered as list rows (per the design) with a slide-
 * over detail drawer.
 */
/** `companyHref` → rows link to a company profile page; omitted → rows open the side drawer. */
export function MarketCompanies({ companyHref }: { companyHref?: (idOrSlug: string) => string } = {}) {
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
	const [sort, setSort] = useState(() => url.oneOf('sort', COMPANY_SORTS.map(([v]) => v), '-created_at'));
	const [page, setPage] = useState(() => url.num('page', 1));
	// The detail drawer is addressable: ?company=<slug> reopens it on load. The
	// slug is format-validated (useUrlModal's default), so a junk param won't fire
	// a fetch or open an empty drawer.
	const [openId, setOpenId] = useUrlModal('company');
	// Fundraising is a Scout-only signal (useCanSeeFundraising); the $ column
	// slot only exists for them. Saved state for every row in one lookup.
	const canSeeRaising = useCanSeeFundraising();
	const statusWidth = canSeeRaising ? 48 : 26;
	const savedIds = useSavedCompanyIds();
	const reset = () => setPage(1);

	// Mirror the whole view-state into the URL (defaults omitted to keep it short).
	useUrlSync({
		view: view !== 'table' ? view : undefined,
		q: dq, model, sector, sub: subSector, subsub: subSubSector, sport, country,
		city, continent, region, tech: techTag, funding, founded,
		verified, raising, unicorn,
		sort: sort !== '-created_at' ? sort : undefined,
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

	const params = useMemo(() => {
		const p: Record<string, unknown> = { page, limit: PAGE_SIZE, sort };
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
	}, [page, sort, dq, model, sectors, sector, subSector, subSubSector, sport, country, funding, founded, verified, raising, canSeeRaising, unicorn, adv.hasAccess, city, continent, region, techTag]);

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
		filtersReady ? qk.companies.list(params) : null,
		{ keepPreviousData: true },
	);
	const rows = all.data?.data ?? [];
	const total = all.data?.total ?? 0;

	const anyFilter = !!(dq || model || sector || subSector || subSubSector || sport || country || city || continent || region || techTag || funding || founded || verified || raising || unicorn);
	const clearAll = () => { setQ(''); setModel(''); setSector(''); setSubSector(''); setSubSubSector(''); setSport(''); setCountry(''); setCity(''); setContinent(''); setRegion(''); setTechTag(''); setFunding(''); setFounded(''); setVerified(false); setRaising(false); setUnicorn(false); setSort('-created_at'); setPage(1); };
	// Filter defs for the toolbar — each change resets to page 1, as before.
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef =>
		({ kind: 'select', key, label, value, options, onChange: (v) => { set(v); reset(); } });
	const tog = (key: string, label: string, value: boolean, set: (v: boolean) => void): FilterDef =>
		({ kind: 'toggle', key, label, value, onChange: (v) => { set(v); reset(); } });

	return (
		<>
			<FilterBar
				search={{ value: q, onChange: (v) => { setQ(v); reset(); }, placeholder: 'Search companies' }}
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
				sort={{ value: sort, options: COMPANY_SORTS, onChange: (v) => { setSort(v); reset(); } }}
				onMenuOpen={wantOptions}
				canClear={anyFilter}
				onClear={clearAll}
			/>

			{/* `!filtersReady` counts as loading: the key is still null then, so
			    SWR reports isLoading=false and this would fall through to
			    "No companies match your filters" before the first request. */}
			{(all.isLoading || !filtersReady) && rows.length === 0 ? <Loading />
				: rows.length === 0 ? <Empty>No companies match your filters.</Empty>
					: (
						<div className="atlas-card atlas-chart-card" style={{ marginTop: 10 }}>
							<div className="atlas-chart-card__head" style={{ padding: '17px 25px 16px', fontSize: 13, color: 'var(--a-muted)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
								<span>{total.toLocaleString()} compan{total === 1 ? 'y' : 'ies'}{anyFilter ? ' match your filters' : ' · Filter to refine results'}</span>
								<div style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ViewToggle value={view} onChange={setView} /><ExportButton entity="companies" search={dq} params={params} /></div>
							</div>
							{view === 'cards'
								? <div className="mkt-list">{rows.map((c) => <CompanyRow key={c.id} c={c} href={companyHref?.(c.slug ?? c.id)} onOpen={() => setOpenId(c.slug ?? c.id)} saved={savedIds.has(c.id)} canSeeRaising={canSeeRaising} />)}</div>
								: (
								<div className="atlas-table mkt-table" role="table">
									{/* Company, then its status marks in their own narrow column
									    (verified; fundraising for Scout only) so they line up down
									    the page, Sector as icon + sub-category, Location as flag +
									    city, Funding, and a bookmark. Founded, sport and model live
									    on the profile and in the filters. */}
									<div className="atlas-table__head">
										<span className="atlas-table__name">Company</span>
										<span className="atlas-table__col" style={{ width: statusWidth }}><span className="sr-only">Status</span></span>
										<span className="atlas-table__col hide-sm mkt-sector">Sector</span>
										<span className="atlas-table__col hide-sm" style={{ width: 170 }}>Location</span>
										<span className="atlas-table__col" style={{ width: 96, textAlign: 'right' }}>
											{/* Sorts by funding; pressed again it returns to the default order. */}
											<button type="button" className="mkt-sort" aria-pressed={sort === '-total_funding'}
												onClick={() => { setSort(sort === '-total_funding' ? '-created_at' : '-total_funding'); reset(); }}>
												Funding{sort === '-total_funding' ? ' ↓' : ''}
											</button>
										</span>
										<span className="atlas-table__col" style={{ width: 32 }}><span className="sr-only">Save</span></span>
									</div>
									{rows.map((c) => {
										const href = companyHref?.(c.slug ?? c.id);
										const hq = [c.hq_city, c.hq_country].filter(Boolean).join(', ');
										const funding = fmtUsd(c.total_funding_usd == null ? null : Number(c.total_funding_usd));
										const inner = <>
											<div className="atlas-table__name">
												<Logo co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={30} radius={6} />
												<div className="atlas-table__name-main">
													{/* The name is the row's link; its ::after covers the row, so the
													    whole row opens the company while the bookmark stays its own
													    button (no button inside a link). */}
													{href
														? <Link href={href} className="atlas-ellipsis mkt-row-link" style={{ fontWeight: 600, minWidth: 0 }}>{c.name}</Link>
														: <span className="atlas-ellipsis" style={{ fontWeight: 600, minWidth: 0 }}>{c.name}</span>}
												</div>
											</div>
											<span className="atlas-table__col" style={{ width: statusWidth }}>
												<StatusMarks verified={c.is_verified} raising={canSeeRaising && c.is_actively_raising} showRaisingSlot={canSeeRaising} />
											</span>
											{/* Sector as its icon (name on hover), then the sub-category. */}
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
											<span className="atlas-table__col mkt-save" style={{ width: 32 }}>
												<SaveToWatchlist companyId={c.id} companyName={c.name} compact saved={savedIds.has(c.id)} />
											</span>
										</>;
										return href
											? <div key={c.id} className="atlas-table__row mkt-row">{inner}</div>
											: <div key={c.id} className="atlas-table__row mkt-row" style={{ cursor: 'pointer' }} onClick={() => setOpenId(c.slug ?? c.id)}>{inner}</div>;
									})}
								</div>
								)}
						</div>
					)}

			<ResultCapNote cap={all.data?.cap} total={total} noun="companies" />
	<Pager page={page} totalPages={all.data?.totalPages ?? 1} onPage={setPage} />

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
