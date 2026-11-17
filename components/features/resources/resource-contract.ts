/**
 * The render contract for Reports and Newsletter cards.
 *
 * `ResourceLibrary` reads this shape and nothing else, so each feed maps its
 * own API rows onto it in its leaf component — Reports from `GET /api/reports`,
 * Newsletter from `GET /api/newsletter/articles`. One library, one card set,
 * shared by every tier; only the actions differ per feed.
 */
import type { PinTarget } from '@/components/features/pins/rules';

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
	/**
	 * Has content above the viewer's solution (fix brief N2). Set only for
	 * Explore viewers, and drawn as the currency sign; Raise and Scout never
	 * see it.
	 */
	gated?: boolean;
	tags: string[];
	cover?: string | null;
	/** Where "View" goes. External links open in a new tab. */
	href?: string;
	external?: boolean;
	/** Imperative open, for content whose URL has to be minted per request (report PDFs). */
	onView?: () => void;
	/** Present only when the item can be downloaded. */
	onDownload?: () => void;
	/** `yours`: made for this viewer ("Your benchmark"). */
	badge?: 'yours';
	/** Overrides the hero's "Latest report" label when this item is first. */
	featuredLabel?: string;
	/** What the pin icon beside "Open" pins to Home (fix brief N1). Absent: not pinnable. */
	pin?: PinTarget;
}
