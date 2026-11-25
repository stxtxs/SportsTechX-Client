'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import useSWR from 'swr';
import { Plus } from 'lucide-react';
import { cx } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { CATEGORIES, PILLARS } from '@/components/features/framework/framework-content';
import { FIXED_OPTIONS, MODEL_OPTIONS, OTHER_GOAL_MAX, OTHER_GOAL_PREFIX, useInterestOptions, type Interests } from './interests';
import { QUICK_AVOID } from '@/components/scout/scout-focus';
import { AddDialog, type AddGroup } from './add-dialog';
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

/** Tags → Avoid, Scout only (stored on the Scout thesis). One callback, so a pick that moves sides saves once. */
export interface AvoidProps { value: string[]; onChange: (avoid: string[], prefs: Interests) => void }

export function InterestsEditor({ value, onChange, avoid }: { value: Interests; onChange: (next: Interests) => void; avoid?: AvoidProps }) {
	const toggleIn = (k: keyof Interests, v: string) =>
		onChange({ ...value, [k]: value[k].includes(v) ? value[k].filter((x) => x !== v) : [...value[k], v] });

	return (
		<div className="int-editor">
			<Section title="Goal">
				<GoalsPicker value={value.goals} onChange={(goals) => onChange({ ...value, goals })} />
			</Section>

			<Section title="Sectors"
				hint="Pick a whole sector, a sub-sector or a single sub-sub sector.">
				<SectorTree value={value} onChange={onChange} />
			</Section>

			<Section title="Geography">
				<GeoPicker value={value.geos} onChange={(geos) => onChange({ ...value, geos })} />
			</Section>

			<Section title="Sports">
				<SportsPicker value={value.sports} onToggle={(id) => toggleIn('sports', id)} />
			</Section>

			<Section title="Tags">
				<TagBlocks value={value} onChange={onChange} avoid={avoid} />
			</Section>
		</div>
	);
}

/**
 * One line of five options plus "+ Add" (Preferences second pass, 2). Picked
 * items always show in the line, after the five; the search box is only in Add.
 */
export function LinePicker({ quick, selected, labelOf, onToggle, add, tone }: {
	quick: [value: string, label: string][];
	selected: string[];
	labelOf: (value: string) => string;
	onToggle: (value: string) => void;
	add: { title: string; groups: AddGroup[]; collapsible?: boolean; note?: (value: string) => string | undefined };
	/** Avoid picks show a pale red fill instead of black. */
	tone?: 'avoid';
}) {
	const [open, setOpen] = useState(false);
	const quickVals = new Set(quick.map(([v]) => v));
	const line: [string, string][] = [...quick, ...selected.filter((v) => !quickVals.has(v)).map((v) => [v, labelOf(v)] as [string, string])];
	const boxRef = useRef<HTMLDivElement>(null);
	const measureRef = useRef<HTMLDivElement>(null);
	const keep = useFit(boxRef, measureRef, line, selected);
	return (
		<>
			<div className="int-line" ref={boxRef}>
				<div className="int-chips int-chips--line">
					{line.filter(([v]) => keep.has(v)).map(([v, l]) => (
						<Chip key={v} on={selected.includes(v)} tone={tone} onClick={() => onToggle(v)}>{l}</Chip>
					))}
					<AddButton onClick={() => setOpen(true)} />
				</div>
				{/* Off-screen copy of every candidate, measured to decide how many fit. */}
				<div className="int-chips int-chips--measure" ref={measureRef} aria-hidden="true">
					{line.map(([v, l]) => <span key={v} data-v={v} className="int-chip">{l}</span>)}
					<span data-v="__add" className="int-chip int-chip--add"><Plus size={12} /> Add</span>
				</div>
			</div>
			{open && (
				<AddDialog title={add.title} groups={add.groups} collapsible={add.collapsible} note={add.note}
					selected={selected} onToggle={onToggle} onClose={() => setOpen(false)} />
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
 * Which options fit on one line with "+ Add" (Preferences, 2): picked ones
 * always stay; unpicked suggestions drop from the end until the line fits.
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

export function Chip({ on, onClick, children, large, disabled, tone }: { on?: boolean; onClick?: () => void; children: ReactNode; large?: boolean; disabled?: boolean; tone?: 'avoid' }) {
	return (
		<button type="button" className={cx('int-chip', on && 'on', large && 'int-chip--lg', tone === 'avoid' && 'int-chip--avoid')} aria-pressed={disabled ? undefined : !!on} onClick={onClick} disabled={disabled}>
			{children}
		</button>
	);
}

/* ── Sectors: the Framework's three columns ─────────────────────────────── */

function SectorTree({ value, onChange }: { value: Interests; onChange: (next: Interests) => void }) {
	const { data } = useSWR<SectorRef[] | { data: SectorRef[] }>(qk.reference.sectors(), { dedupingInterval: 60 * 60_000 });
	const list = useMemo(() => (Array.isArray(data) ? data : (data?.data ?? [])), [data]);
	const pillarOrder = Object.keys(PILLARS);
	const catOrder = Object.keys(CATEGORIES);
	const kids = (id: string) => list.filter((s) => s.parent_id === id);
	const tops = list.filter((s) => !s.parent_id)
		.sort((a, b) => pillarOrder.indexOf(a.slug) - pillarOrder.indexOf(b.slug));

	if (!tops.length) return <p className="int-sec__hint">Loading…</p>;

	const has = (id: string) => value.sectors.includes(id) || value.subs.includes(id);
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
						<button type="button" className={cx('int-pillar__badge', has(top.id) && 'on')} aria-pressed={has(top.id)} onClick={() => togglePillar(top.id)}
							title={`Everything ${p?.badge.toLowerCase() ?? top.name}`}>
							{p?.badge ?? top.name}
						</button>
						{cats.map((cat) => (
							<div key={cat.id} className="int-cat">
								<button type="button" className={cx('int-cat__name', has(cat.id) && 'on')} aria-pressed={has(cat.id)} onClick={() => toggleCategory(cat)}>
									{cat.name}
								</button>
								<div className="int-chips int-chips--sub">
									{kids(cat.id).map((sub) => (
										<button key={sub.id} type="button" className={cx('int-sub', has(sub.id) && 'on')} aria-pressed={has(sub.id)} onClick={() => toggleSub(sub)}>
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
			add={{ title: 'Geography', groups, collapsible: true }}
		/>
	);
}

/* ── Sports: five popular ones, the families under Add ──────────────────── */

function SportsPicker({ value, onToggle }: { value: string[]; onToggle: (id: string) => void }) {
	const sports = useInterestOptions().sports.options; // [id, name]
	const byName = useMemo(() => new Map(sports.map(([id, name]) => [name, id])), [sports]);
	const groups = useMemo<AddGroup[]>(() => {
		const grouped = new Set(SPORT_FAMILIES.flatMap((f) => f.sports));
		return [
			...SPORT_FAMILIES.map((f) => ({
				key: f.name, label: f.name,
				options: f.sports.map((n) => [byName.get(n), sportLabel(n)]).filter((x): x is [string, string] => !!x[0]),
			})),
			{ key: 'Other', label: 'Other', options: sports.filter(([, n]) => !grouped.has(n)).map(([id, n]) => [id, sportLabel(n)] as [string, string]) },
		].filter((g) => g.options.length);
	}, [sports, byName]);
	if (!sports.length) return null;
	const quick = POPULAR_SPORTS.slice(0, 5).map((n) => [byName.get(n), sportLabel(n)]).filter((x): x is [string, string] => !!x[0]);
	const name = new Map(sports);
	return <LinePicker quick={quick} selected={value} labelOf={(id) => sportLabel(name.get(id) ?? id)} onToggle={onToggle} add={{ title: 'Sports', groups }} />;
}

/* ── Tags: Include and Avoid ───────────────────────────────────────────── */

/** Include's line: B2B and B2C first, then three tags, before "+ Add". */
const QUICK_INCLUDE_TAGS = ['AI / ML', 'Digital Collectibles', "Women's Sports"];

function TagBlocks({ value, onChange, avoid }: { value: Interests; onChange: (next: Interests) => void; avoid?: AvoidProps }) {
	const opts = useInterestOptions();
	const tags = opts.techs.options; // [id, name]
	const tagName = useMemo(() => new Map(tags), [tags]);
	const tagId = useMemo(() => new Map(tags.map(([id, n]) => [n, id])), [tags]);
	const isModel = (v: string) => MODEL_OPTIONS.includes(v);
	const nameOf = (v: string) => (isModel(v) ? v : tagName.get(v) ?? v);

	const includeGroups = useMemo<AddGroup[]>(() => [
		{ key: 'models', label: 'Business model', options: MODEL_OPTIONS.map((m) => [m, m] as [string, string]) },
		{ key: 'tags', label: 'Tags', options: tags },
	], [tags]);
	const avoidGroups = useMemo<AddGroup[]>(() => {
		const names = (rows: [string, string][]) => [...new Set(rows.map(([, n]) => n).filter(Boolean))]
			.sort((a, b) => a.localeCompare(b)).map((n) => [n, n] as [string, string]);
		return [
			{ key: 'models', label: 'Business model', options: MODEL_OPTIONS.map((m) => [m, m] as [string, string]) },
			{ key: 'sectors', label: 'Sectors', options: names([...opts.sectors.options, ...opts.subs.options]) },
			{ key: 'tags', label: 'Tags', options: names(tags) },
		];
	}, [opts.sectors.options, opts.subs.options, tags]);

	if (!tags.length) return null;
	const included = [...value.models, ...value.techs];
	const includedNames = new Set(included.map(nameOf));

	// Picking on one side takes it off the other.
	const toggleInclude = (v: string) => {
		const key = isModel(v) ? 'models' : 'techs';
		const adding = !value[key].includes(v);
		const next = { ...value, [key]: adding ? [...value[key], v] : value[key].filter((x) => x !== v) };
		if (adding && avoid?.value.includes(nameOf(v))) avoid.onChange(avoid.value.filter((x) => x !== nameOf(v)), next);
		else onChange(next);
	};
	const toggleAvoid = (name: string) => {
		if (!avoid) return;
		const adding = !avoid.value.includes(name);
		const nextAvoid = adding ? [...avoid.value, name] : avoid.value.filter((x) => x !== name);
		const id = tagId.get(name);
		const prefs = adding
			? { ...value, models: value.models.filter((m) => m !== name), techs: id ? value.techs.filter((t) => t !== id) : value.techs }
			: value;
		avoid.onChange(nextAvoid, prefs);
	};

	const quickInclude: [string, string][] = [
		['B2B', 'B2B'], ['B2C', 'B2C'],
		...QUICK_INCLUDE_TAGS.map((n) => [tagId.get(n), n]).filter((x): x is [string, string] => !!x[0]),
	];
	return (
		<div className="int-tagblocks">
			<div className="int-tagblock">
				<h3 className="int-tagblock__title">Include</h3>
				<LinePicker quick={quickInclude} selected={included} labelOf={nameOf} onToggle={toggleInclude}
					add={{ title: 'Include', groups: includeGroups, note: (v) => (avoid?.value.includes(nameOf(v)) ? 'Avoided' : undefined) }} />
			</div>
			{avoid && (
				<div className="int-tagblock">
					<h3 className="int-tagblock__title">Avoid</h3>
					<LinePicker tone="avoid" quick={QUICK_AVOID.map((n) => [n, n] as [string, string])} selected={avoid.value} labelOf={(v) => v} onToggle={toggleAvoid}
						add={{ title: 'Avoid', groups: avoidGroups, note: (v) => (includedNames.has(v) ? 'Included' : undefined) }} />
				</div>
			)}
		</div>
	);
}
