'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Minus, Search, X } from 'lucide-react';
import { cx } from '@/components/atlas';

/**
 * The "+ Add" list behind every one-line picker on Preferences: the only place
 * with a search box. Groups can carry their own selectable value (a continent)
 * and open to their options (its countries); headings can carry a tick box
 * that ticks everything under them, with a dash when partly ticked (4.1).
 * Options can be indented (the sector tree in Avoid, 4.6).
 */
export type AddOption = [value: string, label: string, depth?: number];

export interface AddGroup {
	key: string;
	label: string;
	/** Set when the group itself can be picked (a continent). */
	value?: string;
	options: AddOption[];
	/** The heading has a tick box for everything under it (4.1). */
	tick?: boolean;
}

export function AddDialog({ title, groups, selected, onToggle, onSetMany, onClose, collapsible = false, note, blocked, tone }: {
	title: string;
	groups: AddGroup[];
	selected: string[];
	onToggle: (value: string) => void;
	/** Tick or clear several at once (a heading tick box). */
	onSetMany?: (values: string[], on: boolean) => void;
	onClose: () => void;
	/** Groups start closed and open to their options (Geography). */
	collapsible?: boolean;
	/** A short note beside an option. */
	note?: (value: string) => string | undefined;
	/** Chosen elsewhere: shown with this note, but can't be picked (4.6). */
	blocked?: (value: string) => string | undefined;
	/** Avoid picks show the pale red tick (4.6). */
	tone?: 'avoid';
}) {
	const [q, setQ] = useState('');
	const [open, setOpen] = useState<Set<string>>(new Set());
	const boxRef = useRef<HTMLDivElement>(null);
	const closeRef = useRef(onClose);
	useEffect(() => { closeRef.current = onClose; });
	useEffect(() => {
		const opener = document.activeElement as HTMLElement | null;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') { closeRef.current(); return; }
			if (e.key !== 'Tab' || !boxRef.current) return;
			// Keep Tab inside the dialog.
			const items = boxRef.current.querySelectorAll<HTMLElement>('button:not(:disabled), input');
			const first = items[0], last = items[items.length - 1];
			if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
			else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
		};
		window.addEventListener('keydown', onKey);
		return () => { window.removeEventListener('keydown', onKey); opener?.focus(); };
	}, []);

	const term = q.trim().toLowerCase();
	const shown = groups
		.map((g) => ({
			...g,
			all: g.options,
			headHit: !!term && g.label.toLowerCase().includes(term),
			options: term && !g.label.toLowerCase().includes(term) ? g.options.filter(([, l]) => l.toLowerCase().includes(term)) : g.options,
		}))
		.filter((g) => !term || g.headHit || g.options.length);
	const toggleOpen = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });
	const sel = new Set(selected);

	return (
		<div className="int-dlg" role="presentation" onClick={onClose}>
			<div ref={boxRef} className={cx('int-dlg__box', tone === 'avoid' && 'int-dlg--avoid')} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
				<div className="int-dlg__head">
					<h2 className="int-dlg__title">{title}</h2>
					<button type="button" className="int-dlg__close" aria-label="Close" onClick={onClose}><X size={16} /></button>
				</div>
				<label className="int-search">
					<Search size={14} aria-hidden="true" />
					<input type="search" autoFocus placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label={`Search ${title.toLowerCase()}`} />
				</label>
				<div className="int-dlg__body">
					{shown.length === 0 && <p className="int-sec__hint">Nothing matches “{q}”.</p>}
					{shown.map((g) => {
						const expanded = !collapsible || !!term || open.has(g.key);
						// The heading tick covers every option under it that can be picked.
						const pickable = g.all.map(([v]) => v).filter((v) => !blocked?.(v));
						const on = pickable.filter((v) => sel.has(v)).length;
						const state = on === 0 ? 'off' : on === pickable.length ? 'on' : 'some';
						return (
							<section key={g.key} className="int-dlg__group">
								<div className="int-dlg__ghead">
									{collapsible && (
										<button type="button" className="int-dlg__caret" aria-expanded={expanded} aria-label={`${expanded ? 'Close' : 'Open'} ${g.label}`} onClick={() => toggleOpen(g.key)}>
											{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
										</button>
									)}
									{g.value ? (
										<Row value={g.value} label={g.label} on={sel.has(g.value)} onToggle={onToggle} strong note={note?.(g.value)} blockedNote={blocked?.(g.value)} />
									) : g.tick && onSetMany ? (
										// Everything under it chosen elsewhere: the heading shows, disabled.
										<button type="button" className={cx('int-dlg__row int-dlg__row--strong', state !== 'off' && 'on', !pickable.length && 'is-blocked')}
											aria-pressed={state === 'some' ? 'mixed' : state === 'on'} disabled={!pickable.length}
											onClick={() => onSetMany(pickable, state !== 'on')}>
											<span className="int-dlg__box-check" aria-hidden="true">
												{state === 'on' ? <Check size={11} /> : state === 'some' ? <Minus size={11} /> : null}
											</span>
											<span>{g.label}</span>
										</button>
									) : <span className="int-dlg__glabel">{g.label}</span>}
								</div>
								{expanded && g.options.length > 0 && (
									<div className={cx('int-dlg__grid', (collapsible || g.tick) && 'int-dlg__grid--nested', g.options.some((o) => o[2]) && 'int-dlg__grid--tree')}>
										{g.options.map(([v, l, depth]) => (
											<Row key={v} value={v} label={l} depth={term ? 0 : depth} on={sel.has(v)} onToggle={onToggle} note={note?.(v)} blockedNote={blocked?.(v)} />
										))}
									</div>
								)}
							</section>
						);
					})}
				</div>
				<div className="int-dlg__foot">
					<button type="button" className="atlas-btn atlas-btn--primary" onClick={onClose}>Done</button>
				</div>
			</div>
		</div>
	);
}

function Row({ value, label, on, onToggle, strong, note, blockedNote, depth }: {
	value: string; label: string; on: boolean; onToggle: (v: string) => void;
	strong?: boolean; note?: string; blockedNote?: string; depth?: number;
}) {
	const blocked = !!blockedNote;
	return (
		<button type="button" className={cx('int-dlg__row', on && 'on', strong && 'int-dlg__row--strong', blocked && 'is-blocked')}
			style={depth ? { paddingLeft: 8 + depth * 22 } : undefined}
			aria-pressed={blocked ? undefined : on} disabled={blocked} onClick={() => onToggle(value)}>
			<span className="int-dlg__box-check" aria-hidden="true">{on && <Check size={11} />}</span>
			<span>{label}</span>
			{(blockedNote ?? note) && <span className="int-dlg__note">{blockedNote ?? note}</span>}
		</button>
	);
}
