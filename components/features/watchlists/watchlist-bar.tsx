'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpLeft, Download, Pin, Trash2 } from 'lucide-react';
import { Action, Seg, cx } from '@/components/atlas';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { ExportModal } from '@/components/features/exports/export-modal';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { hrefOf } from '@/lib/routes';
import {
	deleteWatchlist, isInvestorList, renameWatchlist, useCompanyWatchlists, useWatchlistCompanies,
	type CompanyWatchlist,
} from './use-company-watchlists';
import { useWatchlistPins } from './use-watchlist-pins';
import '@/components/features/market/market.css';
import './watchlists.css';

type View = 'list' | 'board';

/**
 * The top of a list, under the tabs: the name (click to rename) and count on
 * the left; on the right a small "Back" above List / Board and the icon group
 * (pin, Export, Delete). Only existing controls. The page header above stays
 * the same as on every other Deal Flow tab, so nothing jumps.
 */
export function WatchlistBar({ list, view, onView }: {
	list: CompanyWatchlist;
	/** Scout's List / Board switch; omitted where there is no board. */
	view?: View;
	onView?: (v: View) => void;
}) {
	const router = useRouter();
	const confirm = useConfirm();
	const { data: profile } = useUserProfile();
	const isRaise = getUserType(profile) === 'raise';
	const { lists } = useCompanyWatchlists();
	const { companies } = useWatchlistCompanies(list.id);
	const n = list.company_count ?? companies.length;
	const investors = isInvestorList(list);
	// Never the last list (Raise always keeps its Investor Watchlist board).
	const ownKind = lists.filter((l) => isInvestorList(l) === investors);
	const canDelete = isRaise || ownKind.length > 1;
	const [busy, setBusy] = useState(false);
	const [exporting, setExporting] = useState(false);

	const remove = async () => {
		if (n > 0) {
			const ok = await confirm({
				title: `Delete ${list.name}?`,
				description: investors
					? `The ${n} investors in it move back to your Investor Watchlist.`
					: `The ${n} companies in it are removed from this list only.`,
				confirmLabel: 'Delete',
				cancelLabel: 'Cancel',
				destructive: true,
			});
			if (!ok) return;
		}
		setBusy(true);
		try {
			await deleteWatchlist(list.id);
			toast.success(`${list.name} deleted.`);
			router.push(hrefOf('watchlists'));
		} catch (e) {
			toast.error((e as Error).message);
			setBusy(false);
		}
	};

	return (
		<div className="atlas-wl-top">
			{/* A small "Back" on the right, above the buttons. */}
			<div className="atlas-wl-top__back">
				<Action icon={<ArrowUpLeft />} href={hrefOf('watchlists')}>Back</Action>
			</div>
			<div className="atlas-wl-bar">
				<div className="atlas-wl-bar__id">
					<ListName list={list} />
					<span className="atlas-wl-bar__count">{n} {investors ? `investor${n === 1 ? '' : 's'}` : `compan${n === 1 ? 'y' : 'ies'}`}</span>
				</div>
				<div className="atlas-wl-bar__actions">
					{view && onView && (
						<Seg ariaLabel="Watchlist view" value={view} onChange={onView} options={[{ key: 'list', label: 'List' }, { key: 'board', label: 'Board' }]} />
					)}
					{/* Pin, Export and Delete together as icon buttons with hover text,
					    the icon buttons of the Companies toolbar. */}
					<div className="atlas-view-toggle" role="group" aria-label="List actions">
						<PinIconButton id={list.id} />
						{!investors && (
							<button type="button" className="atlas-view-toggle__btn has-tip atlas-wl-icon" data-tip="Export" aria-label="Export this list" onClick={() => setExporting(true)}>
								<Download size={15} aria-hidden="true" />
							</button>
						)}
						<button
							type="button"
							className="atlas-view-toggle__btn has-tip atlas-wl-icon"
							data-tip={canDelete ? 'Delete list' : 'You need at least one watchlist.'}
							aria-label={canDelete ? `Delete ${list.name}` : 'Delete (you need at least one watchlist)'}
							aria-disabled={!canDelete || busy}
							onClick={() => { if (canDelete && !busy) void remove(); }}
						>
							<Trash2 size={15} aria-hidden="true" />
						</button>
					</div>
				</div>
			</div>
			{exporting && <ExportModal entity="companies" filters={null} ids={companies.map((c) => c.id)} onClose={() => setExporting(false)} />}
		</div>
	);
}

/** Pin to the left panel: outline when not, filled teal when pinned (3.2). */
function PinIconButton({ id }: { id: string }) {
	const pins = useWatchlistPins();
	const pinned = pins.isPinned(id);
	return (
		<button
			type="button"
			className={cx('atlas-view-toggle__btn has-tip atlas-wl-icon', pinned && 'is-pinned')}
			data-tip={pinned ? 'Unpin from the panel' : 'Pin to the panel'}
			aria-label={pinned ? 'Unpin from the panel' : 'Pin to the panel'}
			aria-pressed={pinned}
			onClick={() => void pins.toggle(id)}
		>
			<Pin size={15} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
		</button>
	);
}

/**
 * The list's name, renamed in place (remaining 3): click to edit, Enter or
 * clicking away saves, Esc cancels.
 */
function ListName({ list }: { list: CompanyWatchlist }) {
	const [draft, setDraft] = useState<string | null>(null);
	// Esc closes the field without the blur that follows saving it.
	const cancelled = useRef(false);
	const save = async () => {
		const name = draft?.trim() ?? '';
		setDraft(null);
		if (cancelled.current) { cancelled.current = false; return; }
		if (!name || name === list.name) return;
		try {
			await renameWatchlist(list.id, name);
			toast.success(`Renamed to ${name}.`);
		} catch (e) {
			toast.error((e as Error).message);
		}
	};
	if (draft === null) {
		return (
			<button type="button" className="atlas-wl-bar__name" title="Click to rename" onClick={() => { cancelled.current = false; setDraft(list.name); }}>
				{list.name}
			</button>
		);
	}
	return (
		<input
			className="atlas-wl-bar__name atlas-wl-bar__name--edit"
			aria-label="Watchlist name"
			autoFocus
			maxLength={120}
			value={draft}
			size={Math.max(8, draft.length + 1)}
			onChange={(e) => setDraft(e.target.value)}
			onFocus={(e) => e.target.select()}
			onBlur={() => void save()}
			onKeyDown={(e) => {
				if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); }
				if (e.key === 'Escape') { e.preventDefault(); cancelled.current = true; e.currentTarget.blur(); }
			}}
		/>
	);
}
