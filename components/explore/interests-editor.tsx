'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import useSWR from 'swr';
import { Search } from 'lucide-react';
import { cx } from '@/components/atlas';
import { qk } from '@/lib/query-keys';
import type { SectorRef } from '@/hooks/use-sector-tiers';
import { CATEGORIES, PILLARS } from '@/components/features/framework/framework-content';
import { FIXED_OPTIONS, OTHER_GOAL_MAX, OTHER_GOAL_PREFIX, useInterestOptions, type Interests } from './interests';
import { POPULAR_SPORTS, SPORT_FAMILIES, sportLabel } from './sport-families';

/**
 * The Interests editor, in the order people decide: what they're here for,
 * which part of the market, where, which sports, which technologies.
 *
 * Sectors mirror the Framework page (For athletes / fans / executives, its
 * colours and category order) instead of a flat list. Sports open on a short
 * popular set with search, and the rest grouped into families on demand.
 */
interface Ref { id: string; name: string | null }

export function InterestsEditor({ value, onChange }: { value: Interests; onChange: (next: Interests) => void }) {
	const toggleIn = (k: keyof Interests, v: string) =>
		onChange({ ...value, [k]: value[k].includes(v) ? value[k].filter((x) => x !== v) : [...value[k], v] });

	return (
		<div className="int-editor">
			<Section title="What brings you to Atlas?" count={value.goals.length}>
				<GoalsPicker value={value.goals} onChange={(goals) => onChange({ ...value, goals })} />
			</Section>

			<Section title="Which part of the market?" count={value.sectors.length + value.subs.length}
				hint="Pick a whole sector, a sub-sector or a single sub-sub sector.">
				<SectorTree value={value} onChange={onChange} />
			</Section>

			<Section title="Where?" count={value.geos.length}>
				<div className="int-chips">
					{FIXED_OPTIONS.geos.options.map((g) => (
						<Chip key={g} on={value.geos.includes(g)} onClick={() => toggleIn('geos', g)}>{g}</Chip>
					))}
				</div>
			</Section>

			<Section title="Which sports?" count={value.sports.length}>
				<SportsPicker value={value.sports} onToggle={(id) => toggleIn('sports', id)} />
			</Section>

			<Section title="Technologies" hint="Coming soon: following technologies needs a small API update, so these can't be saved yet.">
				<TechPreview />
			</Section>
		</div>
	);
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

function Section({ title, count, hint, children }: { title: string; count?: number; hint?: string; children: ReactNode }) {
	return (
		<section className="int-sec">
			<header className="int-sec__head">
				<h2 className="int-sec__title">{title}</h2>
				{!!count && <span className="int-sec__count">{count} selected</span>}
			</header>
			{hint && <p className="int-sec__hint">{hint}</p>}
			{children}
		</section>
	);
}

function Chip({ on, onClick, children, large, disabled }: { on?: boolean; onClick?: () => void; children: ReactNode; large?: boolean; disabled?: boolean }) {
	return (
		<button type="button" className={cx('int-chip', on && 'on', large && 'int-chip--lg')} aria-pressed={disabled ? undefined : !!on} onClick={onClick} disabled={disabled}>
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

/* ── Sports: popular + search, families on demand ───────────────────────── */

function SportsPicker({ value, onToggle }: { value: string[]; onToggle: (id: string) => void }) {
	const opts = useInterestOptions();
	const [q, setQ] = useState('');
	const [all, setAll] = useState(false);
	const sports = opts.sports.options; // [id, name]
	const byName = useMemo(() => new Map(sports.map(([id, name]) => [name, id])), [sports]);
	const chip = ([id, name]: [string, string]) => (
		<Chip key={id} on={value.includes(id)} onClick={() => onToggle(id)}>{sportLabel(name)}</Chip>
	);

	if (!sports.length) return <p className="int-sec__hint">Loading…</p>;

	const term = q.trim().toLowerCase();
	const popular = POPULAR_SPORTS.map((n) => byName.get(n)).filter((id): id is string => !!id);
	// Picked sports outside the popular set stay visible, so a choice never hides.
	const pickedElsewhere = value.filter((id) => !popular.includes(id));
	const shown = new Set([...popular, ...pickedElsewhere]);
	const grouped = new Set(SPORT_FAMILIES.flatMap((f) => f.sports));
	const families = [
		...SPORT_FAMILIES.map((f) => ({ name: f.name, items: f.sports.map((n) => [byName.get(n), n]).filter((x): x is [string, string] => !!x[0]) })),
		{ name: 'Other', items: sports.filter(([, n]) => !grouped.has(n)) },
	].filter((f) => f.items.length);

	return (
		<div className="int-sports">
			<label className="int-search">
				<Search size={14} aria-hidden="true" />
				<input type="search" placeholder={`Search ${sports.length} sports`} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search sports" />
			</label>

			{term ? (
				<div className="int-chips">
					{sports.filter(([, n]) => n.toLowerCase().includes(term)).map(chip)}
					{!sports.some(([, n]) => n.toLowerCase().includes(term)) && <p className="int-sec__hint">No sport matches “{q}”.</p>}
				</div>
			) : all ? (
				<div className="int-families">
					{families.map((f) => (
						<div key={f.name} className="int-family">
							<div className="int-family__name">{f.name}</div>
							<div className="int-chips">{f.items.map(chip)}</div>
						</div>
					))}
				</div>
			) : (
				<div className="int-chips">
					{sports.filter(([id]) => shown.has(id))
						.sort((a, b) => (popular.indexOf(a[0]) + 1 || 99) - (popular.indexOf(b[0]) + 1 || 99))
						.map(chip)}
				</div>
			)}

			{!term && (
				<button type="button" className="int-more" onClick={() => setAll(!all)}>
					{all ? 'Show popular sports' : `Show all ${sports.length} sports`}
				</button>
			)}
		</div>
	);
}

/* ── Technologies: shown, not yet saveable ──────────────────────────────── */

function TechPreview() {
	const { data } = useSWR<Ref[] | { data: Ref[] }>(qk.reference.techTags(), { dedupingInterval: 60 * 60_000 });
	const tags = Array.isArray(data) ? data : (data?.data ?? []);
	if (!tags.length) return null;
	return (
		<div className="int-chips">
			{tags.map((t) => <Chip key={t.id} disabled>{t.name}</Chip>)}
		</div>
	);
}
