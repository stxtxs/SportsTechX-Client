'use client';

import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArrowUpRight, Pin, Plus } from 'lucide-react';
import useSWR from 'swr';
import { Button, Empty, Input, Loading, Logo, Seg, cx } from '@/components/atlas';
import { Modal } from '@/components/atlas/patterns/modal';
import { qk } from '@/lib/query-keys';
import { fmtFullDate } from '@/lib/format';
import { hrefOf } from '@/lib/routes';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import {
	useCompanyWatchlists, useWatchlistCompanies, createWatchlist, isInvestorList,
	type CompanyWatchlist,
} from './use-company-watchlists';
import { INVESTOR_WATCHLIST_ID, useWatchlistPins } from './use-watchlist-pins';
import { useWatchlistSettings } from './use-watchlist-settings';
import './watchlists.css';

const count = (n: number, noun: 'investor' | 'company' | 'raise') =>
	`${n} ${noun === 'company' ? `compan${n === 1 ? 'y' : 'ies'}` : `${noun}${n === 1 ? '' : 's'}`}`;

/**
 * Watchlists (preview fixes, section 2): every list as a content card (name,
 * count, last updated, the first few logos, Open) with its pin. Rename and
 * Delete live inside the list (WatchlistBar). "New watchlist" sits under the tabs.
 * Raise users also keep investor lists here; Scout also has Saved raises.
 */
export function WatchlistsOverview({ watchlistHref }: { watchlistHref: (id: string) => string }) {
	const { lists: all, isLoading } = useCompanyWatchlists();
	const { data: profile } = useUserProfile();
	const tier = getUserType(profile);
	const isRaise = tier === 'raise';
	// Raise's default list is the Investor Watchlist: the investors not filed in
	// a named list, tracked on the stage board at /pipeline (handover v1 B9).
	const pipe = useSWR<{ data: Array<{ watchlist_id: string | null }> }>(isRaise ? qk.raise.pipeline() : null);
	const mainCount = (pipe.data?.data ?? []).filter((r) => !r.watchlist_id).length;
	// Investor lists only mean something on Raise (see use-nav).
	const lists = isRaise ? all : all.filter((l) => !isInvestorList(l));
	const pins = useWatchlistPins();
	const { investorListName } = useWatchlistSettings();
	if (isLoading) return <Loading />;
	if (lists.length === 0 && !isRaise) {
		return (
			<Empty>
				No watchlists yet. Save a company or an investor and it shows up here.{' '}
				<Button size="sm" href={hrefOf('companies')}>Browse companies</Button>
			</Empty>
		);
	}

	const total = lists.length + (isRaise ? 1 : 0);
	return (
		<>
			{/* Page actions sit under the tabs, so the header never moves (remaining 1). */}
			<div className="atlas-wl-bar">
				<span className="atlas-wl-bar__count">{total} watchlist{total === 1 ? '' : 's'}</span>
				<NewWatchlistButton />
			</div>
			<div className="atlas-wl-grid">
				{isRaise && (
					<ListCard
						title={investorListName} href={hrefOf('pipeline')} meta={`${count(mainCount, 'investor')} · Board from Target to Closed`}
						pinned={pins.isPinned(INVESTOR_WATCHLIST_ID)} onPin={() => void pins.toggle(INVESTOR_WATCHLIST_ID)}
					/>
				)}
				{lists.map((l) => (
					<ListCard
						key={l.id}
						title={l.name}
						href={watchlistHref(l.id)}
						list={l}
						pinned={pins.isPinned(l.id)}
						onPin={() => void pins.toggle(l.id)}
					/>
				))}
			</div>

		</>
	);
}

/** One watchlist as a content card, as on Home and Reports (2.1): the whole card opens it. */
function ListCard({ title, href, meta, list, pinned, onPin }: {
	title: string; href: string;
	/** Fixed line under the title (lists without companies of their own). */
	meta?: string;
	/** A company or investor list: its count, last update and first logos. */
	list?: CompanyWatchlist;
	pinned?: boolean;
	onPin?: () => void;
}) {
	return (
		<article className="atlas-feed-card atlas-wl-card">
			<div className="atlas-feed-card__top">
				<span className="atlas-feed-card__tag">Watchlist</span>
				<span className="atlas-feed-card__actions">
					{onPin && (
						<button type="button" className={cx('atlas-feed-card__pin', pinned && 'is-on')} aria-pressed={!!pinned}
							aria-label={pinned ? `Unpin ${title} from the panel` : `Pin ${title} to the panel`} title={pinned ? 'Pinned to the panel' : 'Pin to the panel'} onClick={onPin}>
							<Pin size={13} strokeWidth={1.75} fill={pinned ? 'currentColor' : 'none'} aria-hidden="true" />
						</button>
					)}
					<Link href={href} className="atlas-feed-card__action">Open <ArrowUpRight size={12} strokeWidth={1.5} aria-hidden="true" /></Link>
				</span>
			</div>
			<h3 className="atlas-feed-card__title">{title}</h3>
			{list ? <ListMeta list={list} /> : <p className="atlas-wl-card__meta">{meta}</p>}
		</article>
	);
}

/** "[n] companies · Updated Nov 24, 2026" and the first few logos. */
function ListMeta({ list }: { list: CompanyWatchlist }) {
	const investors = isInvestorList(list);
	const { companies } = useWatchlistCompanies(investors ? null : list.id);
	const n = list.company_count ?? companies.length;
	const updated = [...companies.map((c) => c.added_at), (list as { updated_at?: string | null }).updated_at]
		.filter((d): d is string => !!d).sort().pop();
	return (
		<>
			<p className="atlas-wl-card__meta">{count(n, investors ? 'investor' : 'company')}{list.raise_count ? ` · ${count(list.raise_count, 'raise')}` : ''}{updated ? ` · Updated ${fmtFullDate(updated)}` : ''}</p>
			{companies.length > 0 && (
				<div className="atlas-wl-card__logos" aria-hidden="true">
					{companies.slice(0, 5).map((c) => <Logo key={c.id} co={{ name: c.name, website: c.website, custom_logo_url: c.custom_logo_url }} size={26} radius={6} />)}
				</div>
			)}
		</>
	);
}

/** A small dialog for a new list's name (2.3, remaining 6). */
function NameDialog({ open, title, initial, action, onClose, onSubmit, extra }: {
	open: boolean; title: string; initial: string; action: string;
	onClose: () => void; onSubmit: (name: string) => Promise<void>;
	extra?: React.ReactNode;
}) {
	const [name, setName] = useState(initial);
	const [lastOpen, setLastOpen] = useState(false);
	// Start from the list's name each time the dialog opens.
	if (open !== lastOpen) { setLastOpen(open); if (open) setName(initial); }
	const valid = name.trim().length > 0;
	return (
		<Modal
			open={open}
			onOpenChange={(o) => { if (!o) onClose(); }}
			title={title}
			footer={<>
				<Button variant="ghost" onClick={onClose}>Cancel</Button>
				<Button disabled={!valid} onClick={() => void onSubmit(name.trim())}>{action}</Button>
			</>}
		>
			<form onSubmit={(e) => { e.preventDefault(); if (valid) void onSubmit(name.trim()); }} style={{ display: 'grid', gap: 12 }}>
				{extra}
				<Input autoFocus value={name} maxLength={120} onChange={(e) => setName(e.target.value)} placeholder="e.g. Football Infrastructure" aria-label="Watchlist name" />
			</form>
		</Modal>
	);
}

/**
 * "New watchlist": the page's one primary button, top right (2.3). Opens a
 * small dialog for the name; on Raise it also asks what the list holds.
 */
export function NewWatchlistButton() {
	const { data: profile } = useUserProfile();
	const isRaise = getUserType(profile) === 'raise';
	const [open, setOpen] = useState(false);
	const [kind, setKind] = useState<'investors' | 'companies'>('investors');
	return (
		<>
			<Button size="sm" onClick={() => setOpen(true)}><Plus /> New watchlist</Button>
			<NameDialog
				open={open}
				title="New watchlist"
				initial=""
				action="Create"
				onClose={() => setOpen(false)}
				extra={isRaise ? <Seg ariaLabel="New watchlist holds" value={kind} onChange={setKind} options={[{ key: 'investors', label: 'Investors' }, { key: 'companies', label: 'Companies' }]} /> : undefined}
				onSubmit={async (name) => {
					try {
						await createWatchlist(name, isRaise ? kind : 'companies');
						toast.success(`Created ${name}.`);
						setOpen(false);
					} catch (e) { toast.error((e as Error).message); }
				}}
			/>
		</>
	);
}

