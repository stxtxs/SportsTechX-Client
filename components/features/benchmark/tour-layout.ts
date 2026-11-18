/**
 * Geometry for the walkthrough's spotlight: the box around what a step points
 * at, and where its card goes beside it. Pure, so rules.check.ts covers it.
 */

export interface Box { top: number; left: number; width: number; height: number }
export interface Size { width: number; height: number }
export type Side = 'right' | 'below' | 'above' | 'left';

/** Gap between the highlight and the card, and the card's distance from the viewport edge. */
export const CARD_GAP = 14;
export const VIEW_MARGIN = 16;

/** One box around several elements (a step can point at two nav sections). */
export function unionBox(rects: Box[]): Box | null {
	if (rects.length === 0) return null;
	const top = Math.min(...rects.map((r) => r.top));
	const left = Math.min(...rects.map((r) => r.left));
	const bottom = Math.max(...rects.map((r) => r.top + r.height));
	const right = Math.max(...rects.map((r) => r.left + r.width));
	return { top, left, width: right - left, height: bottom - top };
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, Math.max(lo, hi)));

/**
 * Beside the target, on the first side with room: right (the sidebar's
 * items), then below (the top bar's buttons), above, left. Aligned to the
 * target's top or left edge and kept inside the viewport.
 */
export function placeCard(target: Box, card: Size, view: Size): { top: number; left: number; side: Side } {
	const maxTop = view.height - card.height - VIEW_MARGIN;
	const maxLeft = view.width - card.width - VIEW_MARGIN;
	const alignTop = clamp(target.top, VIEW_MARGIN, maxTop);
	const alignLeft = clamp(target.left, VIEW_MARGIN, maxLeft);
	const right = target.left + target.width + CARD_GAP;
	if (right + card.width <= view.width - VIEW_MARGIN) return { top: alignTop, left: right, side: 'right' };
	const below = target.top + target.height + CARD_GAP;
	if (below + card.height <= view.height - VIEW_MARGIN) return { top: below, left: alignLeft, side: 'below' };
	const above = target.top - CARD_GAP - card.height;
	if (above >= VIEW_MARGIN) return { top: above, left: alignLeft, side: 'above' };
	const left = target.left - CARD_GAP - card.width;
	if (left >= VIEW_MARGIN) return { top: alignTop, left, side: 'left' };
	// Nowhere beside it fits (a big target on a small screen): over it, kept on screen.
	return { top: clamp(below, VIEW_MARGIN, maxTop), left: alignLeft, side: 'below' };
}

// ── Keyboard shortcuts in the tour copy ─────────────────────────────────────

export type Device = 'mac' | 'windows' | 'unknown';

/**
 * From the browser's platform string (`navigator.userAgentData.platform`,
 * else `navigator.platform`). Linux and ChromeOS use Ctrl like Windows; a
 * phone or anything unrecognised is 'unknown' and the copy names both.
 */
export function deviceOf(platform: string | null | undefined): Device {
	const p = (platform ?? '').toLowerCase();
	if (/mac|iphone|ipad/.test(p)) return 'mac';
	if (/win|linux|cros|x11/.test(p) && !/android/.test(p)) return 'windows';
	return 'unknown';
}

/** "⌘J", "Ctrl+J", or both with their platforms when the device is unknown. */
export function shortcut(key: string, device: Device): string {
	if (device === 'mac') return `⌘${key}`;
	if (device === 'windows') return `Ctrl+${key}`;
	return `⌘${key} (Mac) or Ctrl+${key} (Windows)`;
}

/**
 * The first name for the welcome heading, or null. Never the email handle:
 * a display name that is just the address's local part is dropped.
 */
export function welcomeName(firstName: string | null, fromDisplayName: boolean, email: string | null | undefined): string | null {
	if (!firstName) return null;
	const handle = (email ?? '').split('@')[0]?.toLowerCase();
	return fromDisplayName && handle && firstName.toLowerCase() === handle ? null : firstName;
}
