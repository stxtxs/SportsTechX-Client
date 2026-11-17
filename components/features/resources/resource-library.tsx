'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowUpRight, Download, FileText, Lock, Newspaper, Pin } from 'lucide-react';
import { Action, Badge, Empty, FeaturedPost, FilterBar, Loading, PostCard, type FilterDef } from '@/components/atlas';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import type { Resource } from './resource-contract';
import './resources.css';

/**
 * Featured item + filterable library, shared by Reports and Newsletter in every
 * product. Built on the Figma post cards (`FeaturedPost` / `PostCard`). Takes a
 * ready array — each caller owns its fetch and maps rows onto `Resource`, so
 * this stays presentation-only.
 *
 * `items` must arrive **newest first**: the first element becomes the hero and
 * the `'old'` sort is a positional `reverse()`, not a date comparison.
 */
const SORTS: [string, string][] = [['new', 'Newest'], ['old', 'Oldest'], ['az', 'Title A–Z']];
const ACCESS: [string, string][] = [['Free', 'Free'], ['Premium', 'Premium']];

export const fmtLongDate = (d?: string | null) =>
	(d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' }) : '');

export function ResourceLibrary({ items, kind, intro, featuredLabel, libraryTitle, noun, viewLabel, isLoading, aside }: {
	items: Resource[];
	/** Picks the meta icon. */
	kind: 'report' | 'edition';
	/** One-line description under the tabs. */
	intro?: string;
	/** e.g. "Latest report". */
	featuredLabel: string;
	/** e.g. "Reports library". */
	libraryTitle: string;
	/** Singular noun for counts, e.g. "report". */
	noun: string;
	/** e.g. "View report". */
	viewLabel: string;
	/** First load with nothing to show yet. Distinguishes "fetching" from "none". */
	isLoading?: boolean;
	/** Right-hand note on the library heading, e.g. the publishing cadence. */
	aside?: ReactNode;
}) {
	// A featured item can bring a partner (the summary and its locked full
	// report): the two sit side by side at the top instead of one hero.
	const pair = items[0]?.pairWith ? items.find((i) => i.id === items[0].pairWith) : undefined;
	const featured = items[0];
	const rest = items.slice(1).filter((i) => i !== pair);
	const [q, setQ] = useState('');
	const [tag, setTag] = useState('');
	const [access, setAccess] = useState('');
	const [sort, setSort] = useState('new');
	const tags = useMemo(() => [...new Set(rest.flatMap((r) => r.tags))].sort().map((t) => [t, t] as [string, string]), [rest]);
	const sel = (key: string, label: string, value: string, options: [string, string][], set: (v: string) => void): FilterDef => ({ kind: 'select', key, label, value, options, onChange: set });
	const dq = useDebouncedValue(q, 200);

	const rows = useMemo(() => {
		const term = dq.trim().toLowerCase();
		const out = rest.filter((r) => (!term || `${r.title} ${r.desc}`.toLowerCase().includes(term)) && (!tag || r.tags.includes(tag)) && (!access || r.access === access));
		if (sort === 'old') return [...out].reverse();
		if (sort === 'az') return [...out].sort((a, b) => a.title.localeCompare(b.title));
		return out;
	}, [rest, dq, tag, access, sort]);

	const MetaIcon = kind === 'report' ? FileText : Newspaper;
	const actionsFor = (r: Resource) => (
		<>
			{r.onView
				? <Action icon={<ArrowUpRight />} onClick={r.onView}>{r.actionLabel ?? viewLabel}</Action>
				: r.href ? <Action icon={<ArrowUpRight />} href={r.href} external={r.external}>{r.actionLabel ?? viewLabel}</Action> : null}
			{r.onDownload && <Action icon={<Download />} onClick={r.onDownload}>Download {noun}</Action>}
			{r.onPin && <Action icon={<Pin />} onClick={r.onPin}>Pin to home</Action>}
		</>
	);
	// Lock badge for a report this viewer can't open yet; "Yours" for one made for them.
	const badgeFor = (r: Resource) => (r.badge === 'locked'
		? <><span aria-hidden="true">·</span><span className="is-premium" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Lock size={11} aria-hidden="true" />Locked</span></>
		: r.badge === 'yours' ? <><span aria-hidden="true">·</span><Badge tone="navy">Yours</Badge></> : null);
	const metaFor = (r: Resource) => (
		<>
			<span>{r.dateLabel ?? fmtLongDate(r.date)}</span>
			<span aria-hidden="true">·</span>
			<span className={r.access === 'Premium' ? 'is-premium' : undefined}>{r.access}</span>
			{badgeFor(r)}
		</>
	);

	if (isLoading && items.length === 0) return <Loading />;
	if (!featured) return <Empty>No {noun}s published yet.</Empty>;

	return (
		<>
			{intro && <p className="atlas-res-intro">{intro}</p>}

			{pair ? (
				<div className="atlas-post-grid atlas-post-grid--pair">
					{[featured, pair].map((r) => (
						<PostCard key={r.id} className="is-paired" cover={r.cover} meta={metaFor(r)} title={r.title} desc={r.desc} tags={r.tags} actions={actionsFor(r)} hint={r.hint} />
					))}
				</div>
			) : (
				<FeaturedPost
					cover={featured.cover}
					metaIcon={<MetaIcon size={12} strokeWidth={1.5} aria-hidden="true" />}
					meta={<>{featured.featuredLabel ?? featuredLabel} · Published {featured.dateLabel ?? fmtLongDate(featured.date)} · <span className={featured.access === 'Premium' ? 'is-premium' : undefined}>{featured.access}</span> {badgeFor(featured)}</>}
					title={featured.title}
					desc={featured.desc}
					tags={featured.tags}
					actions={actionsFor(featured)}
				/>
			)}

			<div className="atlas-res-head">
				<h2 className="atlas-h2">{libraryTitle}</h2>
			</div>
			<FilterBar
				search={{ value: q, onChange: setQ, placeholder: `Search ${noun}s` }}
				groups={[{ label: 'Filters', filters: [sel('topic', 'Topic', tag, tags, setTag), sel('access', 'Access', access, ACCESS, setAccess)] }]}
				sort={{ value: sort, options: SORTS, onChange: setSort }}
				canClear={!!(q || tag || access)}
				onClear={() => { setQ(''); setTag(''); setAccess(''); }}
				count={aside ?? `${rows.length} ${noun}${rows.length === 1 ? '' : 's'}`}
			/>
			<div className="atlas-res-rule" />
			{rows.length === 0 ? <Empty>No {noun}s match your filters.</Empty> : (
				<div className="atlas-post-grid">
					{rows.map((r) => (
						<PostCard key={r.id} cover={r.cover} meta={metaFor(r)} title={r.title} desc={r.desc} tags={r.tags} actions={actionsFor(r)} hint={r.hint} />
					))}
				</div>
			)}
		</>
	);
}
