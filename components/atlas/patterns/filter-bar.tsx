'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Search, Plus, X, ChevronLeft, SlidersHorizontal, Lock } from 'lucide-react';
import { cx } from '../ui/cx';
import { useDismiss } from './use-dismiss';
import { useKeepInViewport } from '../ui/use-keep-in-viewport';
import { useSearchSignal } from '@/hooks/use-search-signal';

/**
 * Figma "Toolbar" filter pattern: pill search · applied-filter pills · black
 * "+ ADD FILTER" menu (categories → options) · "× CLEAR FILTERS" · "SORT BY".
 * Purely presentational — every filter is still owned (state + setter) by the
 * page, which passes them in as `groups`. Nothing here changes what is filtered.
 */

export type FilterDef =
	| { kind: 'select'; key: string; label: string; value: string; options: [string, string][]; onChange: (v: string) => void }
	| { kind: 'toggle'; key: string; label: string; value: boolean; onChange: (v: boolean) => void };

export interface FilterGroup {
	label: string;
	filters: FilterDef[];
	/** When set, the group is shown as locked with this note instead of its filters. */
	locked?: ReactNode;
}

type MenuState = null | { at: 'add' | 'sort' | string; view: 'root' | string };

/** Show an in-menu search when an option list is longer than this. */
const SEARCHABLE_OPTIONS = 5;

/** "Fans & Content › Fantasy Sports & Betting" → leaf + its parent path (sector trees). */
function splitPath(label: string): { leaf: string; path: string } {
	const parts = label.split(' › ');
	return { leaf: parts[parts.length - 1], path: parts.slice(0, -1).join(' › ') };
}

export function FilterBar({ search, groups, sort, canClear, onClear, count, actions }: {
	/** Omit for a filters-only bar (no search box). */
	search?: { value: string; onChange: (v: string) => void; placeholder: string };
	groups: FilterGroup[];
	sort?: { value: string; options: [string, string][]; onChange: (v: string) => void };
	canClear?: boolean;
	onClear?: () => void;
	count?: ReactNode;
	/** Right-aligned list actions (Export, etc.) — rendered before Sort by. */
	actions?: ReactNode;
}) {
	const [menu, setMenu] = useState<MenuState>(null);
	const rootRef = useRef<HTMLDivElement>(null);
	// One menu is open at a time, so one ref serves all three.
	const menuRef = useRef<HTMLDivElement>(null);
	useKeepInViewport(menuRef, menu && `${menu.at}:${menu.view}`);

	// Every catalog search flows through here, so this is the one place that
	// feeds searches into the behavioural personalization profile.
	useSearchSignal(search?.value);

	const closeMenu = useCallback(() => setMenu(null), []);
	useDismiss(rootRef, !!menu, closeMenu);

	const allFilters = useMemo(() => groups.filter((g) => !g.locked).flatMap((g) => g.filters), [groups]);
	const applied = allFilters.filter((f) => (f.kind === 'select' ? !!f.value : f.value));
	const byKey = (k: string) => allFilters.find((f) => f.key === k);
	const toggleMenu = (at: string, view = 'root') => { setFindQ(''); setMenu((m) => (m && m.at === at ? null : { at, view })); };

	// "Search all filters": one box over every filter name and every option value,
	// so a value can be found without knowing which filter holds it.
	const [findQ, setFindQ] = useState('');
	const findTerm = findQ.trim().toLowerCase();
	const found = useMemo(() => {
		if (!findTerm) return [];
		const out: { id: string; title: string; sub: string; on: boolean; apply: () => void }[] = [];
		for (const f of allFilters) {
			if (f.label.toLowerCase().includes(findTerm)) {
				out.push(f.kind === 'toggle'
					? { id: f.key, title: f.label, sub: f.value ? 'On · tap to turn off' : 'Turn on', on: f.value, apply: () => { f.onChange(!f.value); setMenu(null); } }
					: { id: f.key, title: f.label, sub: 'Choose a value', on: !!f.value, apply: () => { setFindQ(''); setMenu({ at: 'add', view: f.key }); } });
			}
			if (f.kind !== 'select') continue;
			for (const [v, l] of f.options) {
				if (!l.toLowerCase().includes(findTerm)) continue;
				const { leaf, path } = splitPath(l);
				out.push({ id: `${f.key}:${v}`, title: leaf, sub: path ? `${f.label} · ${path}` : f.label, on: f.value === v, apply: () => { f.onChange(v); setMenu(null); } });
			}
		}
		return out.slice(0, 60);
	}, [allFilters, findTerm]);

	return (
		<div className="atlas-fbar" ref={rootRef}>
			{search && <div className="atlas-fbar__search">
				<Search size={13} aria-hidden="true" />
				<input
					className="atlas-input atlas-input--search"
					placeholder={search.placeholder}
					value={search.value}
					onChange={(e) => search.onChange(e.target.value)}
					aria-label={search.placeholder}
				/>
			</div>}

			{applied.map((f) => (
				<div className="atlas-fbar__anchor" key={f.key}>
					<span className="atlas-fbar__pill">
						{f.kind === 'select' ? (
							<button type="button" className="atlas-fbar__pill-main" aria-expanded={menu?.at === f.key} onClick={() => toggleMenu(f.key, f.key)}>
								{f.label}<span className="atlas-fbar__pill-val">{optionLabel(f)}</span>
							</button>
						) : (
							<span className="atlas-fbar__pill-main">{f.label}</span>
						)}
						<button type="button" className="atlas-fbar__pill-x" aria-label={`Remove ${f.label} filter`}
							onClick={() => { if (f.kind === 'select') f.onChange(''); else f.onChange(false); setMenu(null); }}>
							<X size={11} />
						</button>
					</span>
					{menu?.at === f.key && f.kind === 'select' && (
						<div ref={menuRef} className="atlas-menu atlas-menu--sheet" role="dialog" aria-label={f.label}>
							<OptionsView f={f} onDone={() => setMenu(null)} />
						</div>
					)}
				</div>
			))}

			<div className="atlas-fbar__anchor">
				<button type="button" className="atlas-btn atlas-btn--primary" aria-expanded={menu?.at === 'add'} onClick={() => toggleMenu('add')}>
					<Plus /> Add filter
				</button>
				{menu?.at === 'add' && (
					<div ref={menuRef} className={cx('atlas-menu atlas-menu--sheet atlas-menu--drill', (groups.length > 1 || menu.view !== 'root') && 'atlas-menu--wide')} role="dialog" aria-label="Add filter">
						{menu.view === 'root' && allFilters.length > 4 && (
							<input className="atlas-menu__search" placeholder="Search all filters…" aria-label="Search all filters" value={findQ}
								onChange={(e) => setFindQ(e.target.value)} autoFocus
								onKeyDown={(e) => { if (e.key === 'Enter' && found[0]) found[0].apply(); }} />
						)}
						{menu.view === 'root' && findTerm ? (
							<div className="atlas-menu__list atlas-menu__list--scroll atlas-menu__list--rows">
								{found.length === 0 && <div className="atlas-menu__empty">No filters or values match “{findQ.trim()}”</div>}
								{found.map((r) => (
									<button key={r.id} type="button" className={cx('atlas-menu__item atlas-menu__item--plain', r.on && 'on')} onClick={r.apply}>
										<span className="atlas-menu__dot" aria-hidden="true" />
										<span className="atlas-menu__opt">{r.title}<span className="atlas-menu__opt-path">{r.sub}</span></span>
									</button>
								))}
							</div>
						) : menu.view === 'root' ? (
							<div className="atlas-menu__groups">
								{groups.map((g) => (
									<div className="atlas-menu__group" key={g.label}>
										{groups.length > 1 && <div className="atlas-menu__label">{g.label}</div>}
										{g.locked ? (
											<div className="atlas-menu__locked"><Lock size={11} /> {g.locked}</div>
										) : g.filters.map((f) => {
											const on = f.kind === 'select' ? !!f.value : f.value;
											return (
												<button key={f.key} type="button" className={cx('atlas-menu__item', on && 'on')}
													aria-pressed={f.kind === 'toggle' ? f.value : undefined}
													onClick={() => (f.kind === 'toggle' ? f.onChange(!f.value) : setMenu({ at: 'add', view: f.key }))}>
													<span className="atlas-menu__dot" aria-hidden="true" />{f.label}
												</button>
											);
										})}
									</div>
								))}
							</div>
						) : (() => {
							const f = byKey(menu.view);
							return f && f.kind === 'select'
								? <OptionsView f={f} onBack={() => setMenu({ at: 'add', view: 'root' })} onDone={() => setMenu(null)} />
								: null;
						})()}
					</div>
				)}
			</div>

			{canClear && onClear && (
				<button type="button" className="atlas-fbar__clear" onClick={() => { onClear(); setMenu(null); }}>
					<X size={11} /> Clear filters
				</button>
			)}

			<div className="atlas-fbar__right">
				{count && <span className="atlas-fbar__count">{count}</span>}
				{actions}
				{sort && (
					<div className="atlas-fbar__anchor">
						<button type="button" className="atlas-btn atlas-btn--outline" aria-expanded={menu?.at === 'sort'} onClick={() => toggleMenu('sort')}>
							<SlidersHorizontal /><span className="atlas-btn__label">Sort by</span>
						</button>
						{menu?.at === 'sort' && (
							<div ref={menuRef} className="atlas-menu atlas-menu--end atlas-menu--sheet" role="dialog" aria-label="Sort by">
								<div className="atlas-menu__list">
									{sort.options.map(([v, l]) => (
										<button key={v} type="button" className={cx('atlas-menu__item', v === sort.value && 'on')} aria-pressed={v === sort.value}
											onClick={() => { sort.onChange(v); setMenu(null); }}>
											<span className="atlas-menu__dot" aria-hidden="true" />{l}
										</button>
									))}
								</div>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/** One select filter's option list (with an optional in-menu search for long lists). */
function OptionsView({ f, onBack, onDone }: { f: Extract<FilterDef, { kind: 'select' }>; onBack?: () => void; onDone: () => void }) {
	const [q, setQ] = useState('');
	const term = q.trim().toLowerCase();
	const opts = term ? f.options.filter(([, l]) => l.toLowerCase().includes(term)) : f.options;
	const pick = (v: string) => { f.onChange(v); onDone(); };
	return (
		<>
			<div className="atlas-menu__head">
				{onBack && <button type="button" className="atlas-menu__back" aria-label="Back to filters" onClick={onBack}><ChevronLeft size={13} /></button>}
				<span>{f.label}</span>
			</div>
			{f.options.length > SEARCHABLE_OPTIONS && (
				<input className="atlas-menu__search" placeholder={`Search ${f.label.toLowerCase()}…`} value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
			)}
			<div className="atlas-menu__list atlas-menu__list--scroll atlas-menu__list--rows">
				{f.value && !term && (
					<button type="button" className="atlas-menu__item atlas-menu__item--plain" onClick={() => pick('')}>
						<span className="atlas-menu__dot" aria-hidden="true" />Any
					</button>
				)}
				{opts.length === 0 && <div className="atlas-menu__empty">{f.options.length === 0 ? 'No options' : 'No matches'}</div>}
				{opts.map(([v, l]) => {
					const { leaf, path } = splitPath(l);
					return (
						<button key={v} type="button" className={cx('atlas-menu__item atlas-menu__item--plain', v === f.value && 'on')} aria-pressed={v === f.value} onClick={() => pick(v)}>
							<span className="atlas-menu__dot" aria-hidden="true" />
							<span className="atlas-menu__opt">{leaf}{path && <span className="atlas-menu__opt-path">{path}</span>}</span>
						</button>
					);
				})}
			</div>
		</>
	);
}

function optionLabel(f: Extract<FilterDef, { kind: 'select' }>): string {
	const l = f.options.find(([v]) => v === f.value)?.[1];
	return l ? splitPath(l).leaf : f.value;
}
