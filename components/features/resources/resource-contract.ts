/**
 * The render contract for Reports and Newsletter cards.
 *
 * `ResourceLibrary` reads this shape and nothing else, so each feed maps its
 * own API rows onto it in its leaf component — Reports from `GET /api/reports`,
 * Newsletter from `GET /api/newsletter/articles`. One library, one card set,
 * shared by every tier; only the actions differ per feed.
 */
export type Access = 'Free' | 'Premium';

export interface Resource {
	/** Stable key — a slug where one exists. */
	id: string;
	title: string;
	desc: string;
	date: string;
	/** Shown instead of the full date when the source only knows month/year (reports). */
	dateLabel?: string;
	access: Access;
	tags: string[];
	cover?: string | null;
	/** Where "View" goes. External links open in a new tab. */
	href?: string;
	external?: boolean;
	/** Imperative open, for content whose URL has to be minted per request (report PDFs). */
	onView?: () => void;
	/** Present only when the item can be downloaded. */
	onDownload?: () => void;
	/** `locked`: this viewer cannot open it yet (lock badge). `yours`: made for this viewer. */
	badge?: 'locked' | 'yours';
	/** Overrides the hero's "Latest report" label when this item is first. */
	featuredLabel?: string;
	/** Present when the item was unpinned from Home and can be pinned back. */
	onPin?: () => void;
	/** Overrides the library's "View" label (a locked report says "Access"). */
	actionLabel?: string;
	/** Shown on hover over the card (a locked report: what opens it). */
	hint?: string;
	/** Shown side by side with this item at the top, instead of one hero (the summary and its locked full report). */
	pairWith?: string;
}
