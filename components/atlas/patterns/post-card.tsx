'use client';

import type { ReactNode } from 'react';
import { Tag } from 'lucide-react';
import { cx } from '../ui/cx';
import { AtlasLogo } from '../brand/atlas-logo';

/**
 * The two content cards from the Figma component sheet, shared by every
 * library-style page (Reports, Newsletter, and anything that lists editorial
 * content in future):
 *
 *  - `FeaturedPost` — "Featured post content card with / highlight": a tall
 *    cover on the left, meta · title · description · tags, a rule, then the
 *    action pills. Always carries the pink highlight.
 *  - `PostCard` — "Default post content cards + hover highlight": a small
 *    cover beside the meta and title, description, underlined tag links, a
 *    rule, actions. The highlight appears on hover, and the action icon flips
 *    from outline to filled with it.
 *
 * Presentation only: callers pass the actions, so a report can offer
 * View + Download while an edition offers View alone.
 */

/** Flags a cover as loaded so its frame can drop the 16:9 placeholder and take
 *  the image's own shape (see .atlas-post__cover--tall). `complete` catches an
 *  image that finished before hydration, whose load event React never sees. */
const markLoaded = (img: HTMLImageElement | null) => { if (img?.complete && img.naturalWidth) img.dataset.loaded = ''; };

/**
 * Cover image. With none, a generated cover — the title on the solution-colour
 * gradient under the Atlas wordmark — rather than the blank frame, which read
 * as a broken image (fix list 17 Nov, 1.12). A real cover replaces it as soon
 * as one is uploaded.
 */
function Cover({ src, alt, className, eager, title }: { src?: string | null; alt: string; className: string; eager?: boolean; title?: ReactNode }) {
	return (
		<div className={className}>
			{src ? (
				// eslint-disable-next-line @next/next/no-img-element
				<img key={src} src={src} alt={alt} loading={eager ? 'eager' : 'lazy'} ref={markLoaded} onLoad={(e) => markLoaded(e.currentTarget)} />
			) : title ? (
				<div className="atlas-post__gencover" aria-hidden="true">
					<AtlasLogo height={18} />
					<span className="atlas-post__gencover-title">{title}</span>
					<span className="atlas-post__gencover-by">SportsTechX research</span>
				</div>
			) : null}
		</div>
	);
}

export function FeaturedPost({ cover, meta, metaIcon, title, desc, tags, actions }: {
	cover?: string | null;
	meta: ReactNode;
	metaIcon?: ReactNode;
	title: ReactNode;
	desc?: string | null;
	tags?: string[];
	actions?: ReactNode;
}) {
	return (
		<article className="atlas-post atlas-post--featured">
			{/* The hero sits at the top of the page — don't lazy-load it. */}
			<Cover src={cover} alt="" className="atlas-post__cover atlas-post__cover--tall" eager title={title} />
			<div className="atlas-post__body">
				<div className="atlas-post__meta">{metaIcon}{meta}</div>
				<h2 className="atlas-post__title atlas-post__title--lg">{title}</h2>
				{desc && <p className="atlas-post__desc">{desc}</p>}
				{!!tags?.length && (
					<div className="atlas-post__chips">{tags.map((t) => <span key={t} className="atlas-post__chip">{t}</span>)}</div>
				)}
				{actions && <div className="atlas-post__actions">{actions}</div>}
			</div>
		</article>
	);
}

export function PostCard({ cover, meta, title, desc, tags, actions, className }: {
	cover?: string | null;
	meta: ReactNode;
	title: ReactNode;
	desc?: string | null;
	tags?: string[];
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<article className={cx('atlas-post atlas-post--card', className)}>
			<Cover src={cover} alt="" className="atlas-post__cover atlas-post__cover--banner" title={title} />
			<div className="atlas-post__cardbody">
				<div className="atlas-post__meta">{meta}</div>
				<h3 className="atlas-post__title">{title}</h3>
				{desc && <p className="atlas-post__desc atlas-post__desc--clamp">{desc}</p>}
				{!!tags?.length && (
					<div className="atlas-post__tags">
						<Tag size={13} strokeWidth={1.5} aria-hidden="true" />
						{tags.map((t) => <span key={t} className="atlas-post__tag">{t}</span>)}
					</div>
				)}
				{actions && <div className="atlas-post__actions atlas-post__actions--card">{actions}</div>}
			</div>
		</article>
	);
}
