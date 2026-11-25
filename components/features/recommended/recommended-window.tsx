'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
import { Button, Seg } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';

/**
 * Recommended, as a filtered view of its parent list (handover v1 §2, §4, A7).
 *
 *   - 10 at a time, in alphabetical order.
 *   - "Refresh list" brings the next 10 and replaces the list (never shows 20).
 *   - Before refreshing, a warning: anything not saved to a watchlist moves to
 *     the end of the queue.
 *
 * Saved items leave the queue (they are in a watchlist now). The queue position
 * is a per-browser convenience; the recommendations themselves come from the
 * server, so a lost position only means starting again from A.
 */
export const REC_PAGE = 10;

const listeners = new Set<() => void>();
const read = (k: string) => { try { return Number(localStorage.getItem(k) ?? '0') || 0; } catch { return 0; } };
const write = (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* not persisted */ } listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useRecommendedWindow<T extends { id: string; name: string }>(items: T[], saved: Set<string>, key: string) {
	const storageKey = `stx:rec-offset:${key}`;
	const offset = useSyncExternalStore(subscribe, () => read(storageKey), () => 0);
	const queue = useMemo(
		() => items.filter((i) => !saved.has(i.id)).sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' })),
		[items, saved],
	);
	const start = queue.length ? offset % queue.length : 0;
	const page = queue.length <= REC_PAGE ? queue : [...queue, ...queue].slice(start, start + REC_PAGE);
	return {
		page,
		canRefresh: queue.length > REC_PAGE,
		refresh: () => write(storageKey, (start + REC_PAGE) % Math.max(queue.length, 1)),
	};
}

/** The "Refresh list" button under the 10, with its confirmation (handover v1 §5). */
export function RefreshList({ onRefresh, disabled }: { onRefresh: () => void; disabled?: boolean }) {
	const [open, setOpen] = useState(false);
	return (
		<div className="atlas-rec-refresh">
			<Button variant="outline" onClick={() => setOpen(true)} disabled={disabled}><RefreshCw size={13} /> Refresh list</Button>
			<Modal
				open={open}
				onOpenChange={setOpen}
				title="Refresh the list?"
				footer={<>
					<Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
					<Button onClick={() => { onRefresh(); setOpen(false); }}>Refresh list</Button>
				</>}
			>
				Anything you haven&apos;t saved to a watchlist moves to the end of your recommendations.
			</Modal>
		</div>
	);
}

export type ListMode = 'recommended' | 'all';

/**
 * "Recommended / All" on the parent list page, kept in the URL (`?list=`).
 * `fallback` is what the page opens on with no `?list`: Recommended on Scout's
 * Companies (Deal Flow 6.6), All elsewhere. Only the other value is written.
 */
export function useListMode(fallback: ListMode = 'all'): [ListMode, (m: ListMode) => void] {
	const params = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();
	const raw = params.get('list');
	const mode: ListMode = raw === 'recommended' || raw === 'all' ? raw : fallback;
	const set = (m: ListMode) => {
		const next = new URLSearchParams(params.toString());
		if (m === fallback) next.delete('list'); else next.set('list', m);
		const qs = next.toString();
		router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
	};
	return [mode, set];
}

export function ListModeSwitch({ value, onChange }: { value: ListMode; onChange: (m: ListMode) => void }) {
	return <Seg<ListMode> ariaLabel="Show" value={value} onChange={onChange} options={[{ key: 'recommended', label: 'Recommended' }, { key: 'all', label: 'All' }]} />;
}

/** A recommended list has no filters, so its switch sits in a bar of its own, where the filter bar would be. */
export function ModeBar({ children }: { children: React.ReactNode }) {
	return <div className="atlas-fbar atlas-fbar--mode">{children}</div>;
}
