'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, ChevronRight, Search, X } from 'lucide-react';
import { cx } from '@/components/atlas';

/**
 * The "+ Add" list behind every one-line picker on Preferences (Preferences
 * second pass, 2): the only place with a search box. Groups can carry their own
 * selectable value (a continent) and open to their options (its countries).
 */
export interface AddGroup {
	key: string;
	label: string;
	/** Set when the group itself can be picked (a continent). */
	value?: string;
	options: [value: string, label: string][];
}

export function AddDialog({ title, groups, selected, onToggle, onClose, collapsible = false, note }: {
	title: string;
	groups: AddGroup[];
	selected: string[];
	onToggle: (value: string) => void;
	onClose: () => void;
	/** Groups start closed and open to their options (Geography). */
	collapsible?: boolean;
	/** A short note beside an option that is picked on the other side (Looks for vs Avoids). */
	note?: (value: string) => string | undefined;
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
			const items = boxRef.current.querySelectorAll<HTMLElement>('button, input');
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
			headHit: !!term && g.label.toLowerCase().includes(term),
			options: term ? g.options.filter(([, l]) => l.toLowerCase().includes(term)) : g.options,
		}))
		.filter((g) => !term || g.headHit || g.options.length);
	const toggleOpen = (k: string) => setOpen((s) => { const n = new Set(s); if (n.has(k)) n.delete(k); else n.add(k); return n; });

	return (
		<div className="int-dlg" role="presentation" onClick={onClose}>
			<div ref={boxRef} className="int-dlg__box" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
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
						return (
							<section key={g.key} className="int-dlg__group">
								<div className="int-dlg__ghead">
									{collapsible && (
										<button type="button" className="int-dlg__caret" aria-expanded={expanded} aria-label={`${expanded ? 'Close' : 'Open'} ${g.label}`} onClick={() => toggleOpen(g.key)}>
											{expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
										</button>
									)}
									{g.value
										? <Row value={g.value} label={g.label} on={selected.includes(g.value)} onToggle={onToggle} strong note={note?.(g.value)} />
										: <span className="int-dlg__glabel">{g.label}</span>}
								</div>
								{expanded && g.options.length > 0 && (
									<div className={cx('int-dlg__grid', collapsible && 'int-dlg__grid--nested')}>
										{g.options.map(([v, l]) => <Row key={v} value={v} label={l} on={selected.includes(v)} onToggle={onToggle} note={note?.(v)} />)}
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

function Row({ value, label, on, onToggle, strong, note }: { value: string; label: string; on: boolean; onToggle: (v: string) => void; strong?: boolean; note?: string }) {
	return (
		<button type="button" className={cx('int-dlg__row', on && 'on', strong && 'int-dlg__row--strong')} aria-pressed={on} onClick={() => onToggle(value)}>
			<span className="int-dlg__box-check" aria-hidden="true">{on && <Check size={11} />}</span>
			<span>{label}</span>
			{note && <span className="int-dlg__note">{note}</span>}
		</button>
	);
}
