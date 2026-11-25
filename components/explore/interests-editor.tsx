'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { cx } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { CATEGORIES, PILLARS } from '@/components/features/framework/framework-content';
import { FIXED_OPTIONS, MODEL_OPTIONS, OTHER_GOAL_MAX, OTHER_GOAL_PREFIX, useInterestOptions, type Interests } from './interests';
import { AddDialog, type AddGroup } from './add-dialog';
import { collapse, findTag, groupTags, titleCase } from './headings';
import { apiRequest } from '@/lib/query-client';
import { CONTINENTS, CONTINENTS_BY_COMPANIES, GLOBAL, toggleGeo } from './geography';
import { POPULAR_SPORTS, SPORT_FAMILIES, sportLabel } from './sport-families';

/**
 * The Preferences editor: Goal · Sectors · Geography · Sports · Tags
 * (Preferences second pass, 1).
 *
 * Sectors mirror the Framework page (For athletes / fans / executives, its
 * colours and category order). Geography, Sports and Tags are one line of five
 * options plus "+ Add", where the full list and its search live (2). Tags has
 * two lines, Include (tags and business models) and, on Scout, Avoid.
 */

/** Tags → Avoid, Scout only (stored on the Scout thesis), by name. */
export interface AvoidProps { value: string[]; onChange: (avoid: string[]) => void }

export function InterestsEditor({ value, onChange, avoid }: { value: Interests; onChange: (next: Interests) => void; avoid?: AvoidProps }) {
	const setIn = (k: 'sports', values: string[], on: boolean) =>
		onChange({ ...value, [k]: on ? [...new Set([...value[k], ...values])] : value[k].filter((x) => !values.includes(x)) });

	return (
		<div className="int-editor">
			<Section title="Goal">
				<GoalsPicker value={value.goals} onChange={(goals) => onChange({ ...value, goals })} />
			</Section>

			<Section title="Sectors"
				hint="Pick a whole sector, a sub-sector or a single sub-sub sector.">
				<SectorTree value={value} onChange={onChange} avoided={avoid?.value} />
			</Section>

			<Section title="Geography">
				<GeoPicker value={value.geos} onChange={(geos) => onChange({ ...value, geos })} />
			</Section>

			<Section title="Sports">
				<SportsPicker value={value.sports} onSetMany={(ids, on) => setIn('sports', ids, on)} />
			</Section>

			<Section title="Tags">
				<TagBlocks value={value} onChange={onChange} avoid={avoid} />
			</Section>
		</div>
	);
}

export interface LineHeading { label: string; values: string[] }

/**
 * One line of options plus "+ Add" (Preferences, 2). Picked items always show;
 * a heading whose members are all picked is one pill (4.2), and clicking it
 * clears them. Unpicked suggestions drop until the line fits, so "+ Add" never
 * wraps. The search box is only in Add.
 */
export function LinePicker({ quick, selected, labelOf, onToggle, onSetMany, add, tone, headings = [], blocked, hide, onOpen }: {
	quick: [value: string, label: string][];
	selected: string[];
	labelOf: (value: string) => string;
	onToggle: (value: string) => void;
	onSetMany?: (values: string[], on: boolean) => void;
	add: { title: string; groups: AddGroup[]; collapsible?: boolean; note?: (value: string) => string | undefined };
	/** Avoid picks show a pale red fill instead of black. */
	tone?: 'avoid';
	/** Full headings collapse into one pill. */
	headings?: LineHeading[];
	/** Chosen elsewhere: shown, not pickable (4.6). */
	blocked?: (value: string) => string | undefined;
	/** Picks the line leaves out (a country under a picked continent). */
	hide?: (value: string) => boolean;
	/** The Add list opened (e.g. to load tag counts). */
	onOpen?: () => void;
}) {
	const [open, setOpen] = useState(false);
	const boxRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const shown = selected.filter((v) => !hide?.(v));
	const groups = collapse(shown, headings);
	const inFull = new Set(groups.filter((g) => g.values.length > 1).flatMap((g) => g.values));
	type Item = { key: string; label: string; values: string[]; on: boolean };
	const items: Item[] = [];
	const seen = new Set<string>();
	for (const [v, l] of quick) {
		if (inFull.has(v) || seen.has(v)) continue;
		seen.add(v);
		items.push({ key: v, label: l, values: [v], on: shown.includes(v) });
	}
	for (const g of groups) {
		const key = g.values.length > 1 ? `heading:${g.label}` : g.values[0]!;
		if (seen.has(key)) continue;
		seen.add(key);
		items.push({ key, label: g.values.length > 1 ? g.label : labelOf(g.values[0]!), values: g.values, on: true });
	}
	const keep = useFit(boxRef, measureRef, items.map((i) => [i.key, i.label]), items.filter((i) => i.on).map((i) => i.key));
	const click = (i: Item) => {
		if (i.values.length > 1) onSetMany?.(i.values, false);
		else onToggle(i.values[0]!);
	};
	return (
		<>
			<div className="int-line" ref={boxRef}>
				<div className="int-chips int-chips--line">
					{items.filter((i) => keep.has(i.key)).map((i) => {
						const note = !i.on ? blocked?.(i.values[0]!) : undefined;
						return (
							<Chip key={i.key} on={i.on} tone={tone} disabled={!!note} blockedNote={note} onClick={() => click(i)}>{i.label}</Chip>
						);
					})}
					<AddButton onClick={() => { setOpen(true); onOpen?.(); }} />
				</div>
				{/* Off-screen copy of every candidate, measured to decide how many fit. */}
				<div className="int-chips int-chips--measure" ref={measureRef} aria-hidden="true">
					{items.map((i) => <span key={i.key} data-v={i.key} className="int-chip">{i.label}</span>)}
					<span data-v="__add" className="int-chip int-chip--add"><Plus size={12} /> Add</span>
				</div>
			</div>
			{open && (
				<AddDialog title={add.title} groups={add.groups} collapsible={add.collapsible} note={add.note} blocked={blocked} tone={tone}
					selected={selected} onToggle={onToggle} onSetMany={onSetMany} onClose={() => setOpen(false)} />
			)}
		</>
	);
}

function AddButton({ onClick }: { onClick: () => void }) {
	return (
		<button type="button" className="int-chip int-chip--add" onClick={onClick} aria-haspopup="dialog">
			<Plus size={12} aria-hidden="true" /> Add
		</button>
	);
}

const LINE_GAP = 8;

/**
 * Which options fit on one line with "+ Add": picked ones always stay;
 * unpicked suggestions drop from the end until the line fits.
 */
function useFit(
	boxRef: React.RefObject<HTMLDivElement | null>,
	measureRef: React.RefObject<HTMLDivElement | null>,
	line: [string, string][],
	selected: string[],
): Set<string> {
	const [width, setWidth] = useState(0);
	const [sizes, setSizes] = useState<Record<string, number>>({});
	useEffect(() => {
		const box = boxRef.current, m = measureRef.current;
		if (!box || !m) return;
		const ro = new ResizeObserver(() => {
			setWidth(box.clientWidth);
			const next: Record<string, number> = {};
			m.querySelectorAll<HTMLElement>('[data-v]').forEach((el) => { next[el.dataset.v!] = el.offsetWidth; });
			setSizes((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next));
		});
		ro.observe(box);
		ro.observe(m);
		return () => ro.disconnect();
	}, [boxRef, measureRef]);

	const keep = new Set(line.map(([v]) => v));
	if (width > 0 && sizes.__add) {
		const total = () => [...keep].reduce((n, v) => n + (sizes[v] ?? 0) + LINE_GAP, sizes.__add);
		for (let i = line.length - 1; i >= 0 && total() > width; i--) {
			const v = line[i]![0];
			if (!selected.includes(v)) keep.delete(v);
		}
	}
	return keep;
}

/** The fixed goals plus "Other…", which opens a short text field. */
function GoalsPicker({ value, onChange }: { value: string[]; onChange: (goals: string[]) => void }) {
	const other = value.find((g) => g.startsWith(OTHER_GOAL_PREFIX));
	const toggle = (g: string) => onChange(value.includes(g) ? value.filter((x) => x !== g) : [...value, g]);
	const setOther = (text: string | null) => {
		const rest = value.filter((g) => !g.startsWith(OTHER_GOAL_PREFIX));
		onChange(text === null ? rest : [...rest, `${OTHER_GOAL_PREFIX}${text}`]);
	};
	return (
		<div className="int-goals">
			<div className="int-chips">
				{FIXED_OPTIONS.goals.options.map((g) => (
					<Chip key={g} on={value.includes(g)} onClick={() => toggle(g)} large>{g}</Chip>
				))}
				<Chip on={other !== undefined} onClick={() => setOther(other !== undefined ? null : '')} large>Other…</Chip>
			</div>
			{other !== undefined && (
				<input
					className="int-other"
					type="text"
					autoFocus
					maxLength={OTHER_GOAL_MAX}
					placeholder="Tell us what you're looking for"
					aria-label="Other goal"
					value={other.slice(OTHER_GOAL_PREFIX.length)}
					onChange={(e) => setOther(e.target.value)}
				/>
			)}
		</div>
	);
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
	return (
		<section className="int-sec">
			<header className="int-sec__head">
				<h2 className="int-sec__title">{title}</h2>
			</header>
			{hint && <p className="int-sec__hint">{hint}</p>}
			{children}
		</section>
	);
}

export function Chip({ on, onClick, children, large, disabled, tone, blockedNote }: { on?: boolean; onClick?: () => void; children: ReactNode; large?: boolean; disabled?: boolean; tone?: 'avoid'; blockedNote?: string }) {
	return (
		<button type="button" title={blockedNote} className={cx('int-chip', on && 'on', large && 'int-chip--lg', tone === 'avoid' && 'int-chip--avoid', blockedNote && 'is-blocked')} aria-pressed={disabled ? undefined : !!on} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	);
}

/* ── Sectors: the Framework's three columns ─────────────────────────────── */

function SectorTree({ value, onChange, avoided = [] }: { value: Interests; onChange: (next: Interests) => void; avoided?: string[] }) {
	const { data } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const list = useMemo(() => (Array.isArray(data) ? data : (data?.data ?? [])), [data]);
	const pillarOrder = Object.keys(PILLARS);
	const catOrder = Object.keys(CATEGORIES);
	const kids = (id: string) => list.filter((s) => s.parent_id === id);
	const tops = list.filter((s) => !s.parent_id)
		.sort((a, b) => pillarOrder.indexOf(a.slug) - pillarOrder.indexOf(b.slug));

	if (!tops.length) return <p className="int-sec__hint">Loading…</p>;

	const has = (id: string) => value.sectors.includes(id) || value.subs.includes(id);
	// Avoided in Tags → Avoid: shown, not pickable; nothing is included and avoided at once (4.6).
	const off = (s: SectorRef) => avoided.includes(s.name ?? '');
	const togglePillar = (id: string) =>
		onChange({ ...value, sectors: value.sectors.includes(id) ? value.sectors.filter((x) => x !== id) : [...value.sectors, id] });
	// A category brings its sub-categories with it; unticking one sub-category
	// then leaves the category unticked, since it's no longer "all of it".
	const toggleCategory = (cat: SectorRef) => {
		const ids = [cat.id, ...kids(cat.id).map((s) => s.id)];
		const subs = has(cat.id)
			? value.subs.filter((x) => !ids.includes(x))
			: [...value.subs, ...ids.filter((x) => !value.subs.includes(x))];
		onChange({ ...value, subs });
	};
	const toggleSub = (sub: SectorRef) => {
		const subs = value.subs.includes(sub.id)
			? value.subs.filter((x) => x !== sub.id && x !== sub.parent_id)
			: [...value.subs, sub.id];
		onChange({ ...value, subs });
	};

	return (
		<div className="int-tree">
			{tops.map((top) => {
				const p = PILLARS[top.slug];
				const cats = kids(top.id).sort((a, b) => catOrder.indexOf(a.slug) - catOrder.indexOf(b.slug));
				return (
					<div key={top.id} className="int-pillar" style={{ '--fw-color': p?.color ?? 'var(--a-ink)' } as CSSProperties}>
						<button type="button" className={cx('int-pillar__badge', has(top.id) && 'on', off(top) && 'is-blocked')} aria-pressed={has(top.id)} onClick={() => togglePillar(top.id)}
							disabled={off(top)} title={off(top) ? 'Avoided' : `Everything ${p?.badge.toLowerCase() ?? top.name}`}>
							{p?.badge ?? top.name}
						</button>
						{cats.map((cat) => (
							<div key={cat.id} className="int-cat">
								<button type="button" className={cx('int-cat__name', has(cat.id) && 'on', off(cat) && 'is-blocked')} aria-pressed={has(cat.id)} onClick={() => toggleCategory(cat)}
									disabled={off(cat)} title={off(cat) ? 'Avoided' : undefined}>
									{cat.name}
								</button>
								<div className="int-chips int-chips--sub">
									{kids(cat.id).map((sub) => (
										<button key={sub.id} type="button" className={cx('int-sub', has(sub.id) && 'on', off(sub) && 'is-blocked')} aria-pressed={has(sub.id)} onClick={() => toggleSub(sub)}
											disabled={off(sub)} title={off(sub) ? 'Avoided' : undefined}>
											{sub.name}
										</button>
									))}
								</div>
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}

/* ── Geography: Global and the busiest continents, countries under Add ──── */

interface Country { name: string; continent: string | null }

const useCompanyCount = (continent: string) =>
	useSWR<{ total?: number }>(qk.companies.list({ continent, limit: 1 }), { dedupingInterval: 60 * 60_000 }).data?.total;

/** Continents by number of companies, most first; the measured order until the counts load. */
function useContinentRanking(): string[] {
	const counts: Record<string, number | undefined> = {
		Africa: useCompanyCount('Africa'),
		Asia: useCompanyCount('Asia'),
		Europe: useCompanyCount('Europe'),
		'North America': useCompanyCount('North America'),
		Oceania: useCompanyCount('Oceania'),
		'South America': useCompanyCount('South America'),
	};
	if (CONTINENTS.some((c) => counts[c] == null)) return CONTINENTS_BY_COMPANIES;
	return [...CONTINENTS].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
}

function GeoPicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
	const { data } = useSWR<Country[] | { data: Country[] }>(qk.reference.countries(), { dedupingInterval: 60 * 60_000 });
	const ranked = useContinentRanking();
	const continentOf = useMemo(() => new Map((Array.isArray(data) ? data : (data?.data ?? [])).map((x) => [x.name, x.continent ?? ''])), [data]);
	const groups = useMemo<AddGroup[]>(() => {
		const list = Array.isArray(data) ? data : (data?.data ?? []);
		return CONTINENTS.map((c) => ({
			key: c, label: c, value: c,
			options: list.filter((x) => x.continent === c).map((x) => [x.name, x.name] as [string, string])
				.sort((a, b) => a[1].localeCompare(b[1])),
		}));
	}, [data]);
	return (
		<LinePicker
			quick={[[GLOBAL, GLOBAL], ...ranked.slice(0, 4).map((c) => [c, c] as [string, string])]}
			selected={value}
			labelOf={(v) => v}
			onToggle={(v) => onChange(toggleGeo(value, v))}
			hide={(v) => { const c = continentOf.get(v); return !!c && value.includes(c); }}
			add={{ title: 'Geography', groups, collapsible: true }}
		/>
	);
}

/* ── Sports: five popular ones, the families under Add, heading tick boxes ── */

function SportsPicker({ value, onSetMany }: { value: string[]; onSetMany: (ids: string[], on: boolean) => void }) {
	const sports = useInterestOptions().sports.options; // [id, name]
	const byName = useMemo(() => new Map(sports.map(([id, name]) => [name, id])), [sports]);
	const groups = useMemo<AddGroup[]>(() => {
		const grouped = new Set(SPORT_FAMILIES.flatMap((f) => f.sports));
		return [
			...SPORT_FAMILIES.map((f) => ({
				key: f.name, label: titleCase(f.name), tick: true,
				options: f.sports.map((n) => [byName.get(n), sportLabel(n)]).filter((x): x is [string, string] => !!x[0]),
			})),
			{ key: 'Other', label: 'Other', tick: true, options: sports.filter(([, n]) => !grouped.has(n)).map(([id, n]) => [id, sportLabel(n)] as [string, string]) },
		].filter((g) => g.options.length);
	}, [sports, byName]);
	if (!sports.length) return null;
	const quick = POPULAR_SPORTS.slice(0, 5).map((n) => [byName.get(n), sportLabel(n)]).filter((x): x is [string, string] => !!x[0]);
	const name = new Map(sports);
	return (
		<LinePicker quick={quick} selected={value} labelOf={(id) => sportLabel(name.get(id) ?? id)}
			onToggle={(id) => onSetMany([id], !value.includes(id))} onSetMany={onSetMany}
			headings={groups.map((g) => ({ label: g.label, values: g.options.map(([v]) => v) }))}
			add={{ title: 'Sports', groups }} />
	);
}

/* ── Tags: Include and Avoid, under the five headings of the new list ───── */

interface TagRow { id: string; name: string; slug: string; display_heading?: string | null }

/** Include's line: B2B and B2C first, then three tags (by their name in the new list). */
const QUICK_INCLUDE = ['AI', 'Collectibles', "Women's Sports"];
/** Avoid's line: a sector, then three tags. */
const QUICK_AVOID_TAGS = ['Web3', 'Virtual Worlds', 'Collectibles'];
const QUICK_AVOID_SECTOR = 'Fantasy Sports & Betting';

/** Companies per tag, loaded once a Tags list opens: a tag with none stays out of + Add (4.5). */
function useTagCounts(enabled: boolean, rows: TagRow[]): Map<string, number> | null {
	const slugs = rows.map((r) => r.slug).filter(Boolean);
	const { data } = useSWR(
		enabled && slugs.length ? ['tag-counts', slugs.join(',')] : null,
		async () => {
			const out = await Promise.all(slugs.map(async (slug) => {
				const res = await apiRequest('GET', `/api/companies?tech_tag=${encodeURIComponent(slug)}&limit=1`);
				const body = res.ok ? ((await res.json()) as { total?: number }) : null;
				return [slug, body?.total ?? 1] as [string, number];
			}));
			return out;
		},
		{ dedupingInterval: 60 * 60_000, revalidateOnFocus: false },
	);
	return useMemo(() => (data ? new Map(data) : null), [data]);
}

function TagBlocks({ value, onChange, avoid }: { value: Interests; onChange: (next: Interests) => void; avoid?: AvoidProps }) {
	const { data: rawTags } = useSWR<TagRow[] | { data: TagRow[] }>(qk.reference.techTags(), { dedupingInterval: 60 * 60_000 });
	const { data: rawSectors } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const rows = useMemo(() => (Array.isArray(rawTags) ? rawTags : (rawTags?.data ?? [])), [rawTags]);
	const sectors = useMemo(() => (Array.isArray(rawSectors) ? rawSectors : (rawSectors?.data ?? [])), [rawSectors]);
	const [wantCounts, setWantCounts] = useState(false);
	const counts = useTagCounts(wantCounts, rows);

	const tagName = useMemo(() => new Map(rows.map((r) => [r.id, r.name])), [rows]);
	const isModel = (v: string) => MODEL_OPTIONS.includes(v);
	const nameOf = (v: string) => (isModel(v) ? v : tagName.get(v) ?? v);
	// A tag with no companies stays out of the lists once counts are in (4.5).
	const shownRows = useMemo(() => rows.filter((r) => !counts || (counts.get(r.slug) ?? 1) > 0), [rows, counts]);
	const tagGroups = useMemo(() => groupTags(shownRows), [shownRows]);

	// Sectors as the Sectors tree: pillar headings, categories, then sub-sectors indented (4.6).
	const sectorTree = useMemo(() => {
		const pillarOrder = Object.keys(PILLARS);
		const catOrder = Object.keys(CATEGORIES);
		const kids = (id: string) => sectors.filter((x) => x.parent_id === id);
		return sectors.filter((x) => !x.parent_id)
			.sort((a, b) => pillarOrder.indexOf(a.slug) - pillarOrder.indexOf(b.slug))
			.map((top) => ({
				top,
				options: kids(top.id).sort((a, b) => catOrder.indexOf(a.slug) - catOrder.indexOf(b.slug))
					.flatMap((cat) => [[cat.name ?? '', cat.name ?? '', 0] as [string, string, number],
						...kids(cat.id).map((sub) => [sub.name ?? '', sub.name ?? '', 1] as [string, string, number])]),
			}));
	}, [sectors]);
	// Names of everything picked in Sectors, a picked sector's whole branch included.
	const inSectors = useMemo(() => {
		const picked = new Set([...value.sectors, ...value.subs]);
		const out = new Set<string>();
		const walk = (id: string, under: boolean) => {
			const node = sectors.find((x) => x.id === id);
			const on = under || picked.has(id);
			if (on && node?.name) out.add(node.name);
			sectors.filter((x) => x.parent_id === id).forEach((k) => walk(k.id, on));
		};
		sectors.filter((x) => !x.parent_id).forEach((t) => walk(t.id, false));
		return out;
	}, [sectors, value.sectors, value.subs]);

	if (!rows.length) return null;
	const models: [string, string][] = MODEL_OPTIONS.map((m) => [m, m]);
	const avoided = new Set(avoid?.value ?? []);
	const includedNames = new Set([...value.models, ...value.techs.map((id) => tagName.get(id) ?? id)]);

	// Include: business models and tags; an avoided one can't be picked.
	const includeGroups: AddGroup[] = [
		{ key: 'models', label: 'Business model', tick: true, options: models },
		...tagGroups.map((g) => ({ key: g.heading, label: g.heading, tick: true, options: g.tags.map((t) => [t.id, t.name] as [string, string]) })),
	];
	const included = [...value.models, ...value.techs];
	const setInclude = (vals: string[], on: boolean) => {
		const m = vals.filter(isModel), t = vals.filter((v) => !isModel(v));
		const apply = (cur: string[], add: string[]) => (on ? [...new Set([...cur, ...add])] : cur.filter((x) => !add.includes(x)));
		onChange({ ...value, models: apply(value.models, m), techs: apply(value.techs, t) });
	};
	const quickInclude: [string, string][] = [
		['B2B', 'B2B'], ['B2C', 'B2C'],
		...QUICK_INCLUDE.map((n) => findTag(rows, n)).filter((r): r is TagRow => !!r).map((r) => [r.id, r.name] as [string, string]),
	];

	// Avoid: business models, the sector tree and tags, by name; anything included or in Sectors can't be picked.
	const avoidGroups: AddGroup[] = [
		{ key: 'models', label: 'Business model', tick: true, options: models },
		...sectorTree.map(({ top, options }) => ({ key: `sector:${top.id}`, label: titleCase((top.name ?? PILLARS[top.slug]?.badge ?? '').toLowerCase()), tick: true, options })),
		...tagGroups.map((g) => ({ key: `tags:${g.heading}`, label: g.heading, tick: true, options: g.tags.map((t) => [t.name, t.name] as [string, string]) })),
	];
	const setAvoid = (vals: string[], on: boolean) => {
		if (!avoid) return;
		avoid.onChange(on ? [...new Set([...avoid.value, ...vals])] : avoid.value.filter((x) => !vals.includes(x)));
	};
	const quickAvoid: [string, string][] = [
		...(sectors.some((x) => x.name === QUICK_AVOID_SECTOR) ? [[QUICK_AVOID_SECTOR, QUICK_AVOID_SECTOR] as [string, string]] : []),
		...QUICK_AVOID_TAGS.map((n) => findTag(rows, n)).filter((r): r is TagRow => !!r).map((r) => [r.name, r.name] as [string, string]),
	];

	return (
		<div className="int-tagblocks">
			<div className="int-tagblock">
				<h3 className="int-tagblock__title">Include</h3>
				<LinePicker quick={quickInclude} selected={included} labelOf={nameOf}
					onToggle={(v) => setInclude([v], !included.includes(v))} onSetMany={setInclude}
					headings={includeGroups.map((g) => ({ label: g.label, values: g.options.map(([v]) => v) }))}
					blocked={(v) => (avoided.has(nameOf(v)) ? 'Avoided' : undefined)}
					onOpen={() => setWantCounts(true)}
					add={{ title: 'Include', groups: includeGroups }} />
			</div>
			{avoid && (
				<div className="int-tagblock">
					<h3 className="int-tagblock__title">Avoid</h3>
					<LinePicker tone="avoid" quick={quickAvoid} selected={avoid.value} labelOf={(v) => v}
						onToggle={(v) => setAvoid([v], !avoid.value.includes(v))} onSetMany={setAvoid}
						headings={avoidGroups.map((g) => ({ label: g.label, values: g.options.map(([v]) => v) }))}
						blocked={(v) => (includedNames.has(v) ? 'Included' : inSectors.has(v) ? 'In your sectors' : undefined)}
						onOpen={() => setWantCounts(true)}
						add={{ title: 'Avoid', groups: avoidGroups }} />
				</div>
			)}
		</div>
	);
}
