/**
 * Self-check for the benchmark rules and thesis prefill. Run it with:
 *   node components/features/benchmark/rules.check.ts
 */
import assert from 'node:assert/strict';
import { MAX_PINS, SLUG } from './config.ts';
import {
	PIN_KEY, benchmarkCardAction, defaultPins, fallbackAccess, featuredUntil, gapOf,
	peerOrSample, visiblePins, withChoices, yoursFirst,
} from './rules.ts';
import { applyPrefill, mapSurvey } from './prefill.ts';
import { CARD_GAP, VIEW_MARGIN, deviceOf, placeCard, shortcut, unionBox, welcomeName } from './tour-layout.ts';
import type { BenchmarkAccess, Compare } from './types.ts';

// ── Access fallback: Explore gets summary + locked full; paid get the full only ─
assert.deepEqual(fallbackAccess('explore', false).entries, { r1: 'open', r2: 'locked', r3: 'none' });
assert.deepEqual(fallbackAccess('raise', false).entries, { r1: 'none', r2: 'open', r3: 'none' });
assert.deepEqual(fallbackAccess('scout', false).entries, { r1: 'none', r2: 'open', r3: 'none' });
assert.deepEqual(fallbackAccess('explore', true).entries, { r1: 'none', r2: 'open', r3: 'none' });

const contributor: BenchmarkAccess = {
	...fallbackAccess('explore', false),
	entries: { r1: 'none', r2: 'open', r3: 'open' },
};
assert.equal(benchmarkCardAction(fallbackAccess('explore', false)), 'Read the summary');
assert.equal(benchmarkCardAction(contributor), 'Read the full report');

// ── featured_until: six weeks by default, clamped to 4–6 ───────────────────
assert.equal(featuredUntil('2026-11-23'), '2027-01-04');
assert.equal(featuredUntil('2026-11-23', 4), '2026-12-21');
assert.equal(featuredUntil('2026-11-23', 2), '2026-12-21'); // clamped up to 4
assert.equal(featuredUntil('2026-11-23', 9), '2027-01-04'); // clamped down to 6

// ── Home pins ───────────────────────────────────────────────────────────────
const free = defaultPins(fallbackAccess('explore', false), '2026-11-23');
assert.deepEqual(free.map((p) => p.entry), ['r1', 'ftr'], 'free user: summary + FTR');
assert.equal(free[0].slug, SLUG.r1);

// Paid: the full report on Home, never the summary.
assert.deepEqual(defaultPins(fallbackAccess('scout', false), '2026-11-23').map((p) => p.entry), ['r2', 'ftr'], 'paid: full report + FTR');

const mine = defaultPins(contributor, '2026-11-23');
assert.deepEqual(mine.map((p) => p.entry), ['r3', 'r2', 'ftr'], 'contributor: yours first');
assert.ok(visiblePins(mine, '2026-12-01').length <= MAX_PINS);
assert.equal(visiblePins(mine, '2026-12-01')[0].entry, 'r3');

// Expired after featured_until; still shown on the last day.
assert.equal(visiblePins(mine, '2027-01-04').length, 3);
assert.equal(visiblePins(mine, '2027-01-05').length, 0);

// Unpin removes only that card; re-pin brings it back.
const unpinned = withChoices(mine, { [PIN_KEY.r3]: false });
assert.deepEqual(visiblePins(unpinned, '2026-12-01').map((p) => p.entry), ['r2', 'ftr']);
assert.deepEqual(visiblePins(withChoices(unpinned, { [PIN_KEY.r3]: true }), '2026-12-01').map((p) => p.entry), ['r3', 'r2', 'ftr']);

// Never more than three, whatever the server sends.
const many = [...mine, { ...mine[2], key: 'report:extra' }];
assert.equal(visiblePins(many, '2026-12-01').length, MAX_PINS);

// ── Peer group only at five funds or more ──────────────────────────────────
const cmp: Compare[] = [{ label: 'x', yours: 4, baseline: 3, n: 10 }];
const sample = { funds: 30, comparisons: cmp };
assert.equal(peerOrSample({ peer_group: { label: 'Under $25M', funds: 12, comparisons: cmp }, full_sample: sample }).isPeer, true);
assert.equal(peerOrSample({ peer_group: { label: 'Over $250M', funds: 4, comparisons: cmp }, full_sample: sample }).isPeer, false);
assert.equal(peerOrSample({ peer_group: { label: 'Exactly five', funds: 5, comparisons: cmp }, full_sample: sample }).isPeer, true);
assert.equal(peerOrSample({ peer_group: null, full_sample: sample }).funds, 30);

assert.equal(gapOf({ label: 'x', yours: null, baseline: 3, n: 1 }), null, 'N/A is not a gap');
assert.equal(gapOf({ label: 'x', yours: 2, baseline: 3.25, n: 1 }), -1.25);

// ── Library: "Yours" sorts first ───────────────────────────────────────────
assert.deepEqual(yoursFirst([{ id: 'a' }, { id: 'b' }, { id: 'y' }], 'y').map((x) => x.id), ['y', 'a', 'b']);
assert.deepEqual(yoursFirst([{ id: 'a' }], 'y').map((x) => x.id), ['a']);

// ── Survey → thesis mapping ────────────────────────────────────────────────
assert.deepEqual(mapSurvey(['Early Stage (Pre-Series A – Series A)'], ['Europe', 'North America']), { stages: ['Series A'], regions: ['Europe', 'North America'] });
assert.deepEqual(mapSurvey(['Multi-stage / Stage Agnostic'], ['Global / geography agnostic']), { stages: [], regions: [] }, 'agnostic → empty');
assert.deepEqual(mapSurvey(['Something new'], []), { stages: [], regions: [] }, 'unknown values dropped');

// Prefill fills only empty fields and marks what it holds.
const empty = { stages: [] as string[], regions: [] as string[], sectors: [] as string[] };
const p = { source: 'survey' as const, stages: ['Series A'], regions: ['Europe'], sub_sectors: [], applied_at: null };
const a = applyPrefill(empty, p);
assert.deepEqual(a.thesis.stages, ['Series A']);
assert.deepEqual([...a.fromSurvey].sort(), ['Europe', 'Series A']);

// Never overwrites an edit.
const edited = applyPrefill({ ...empty, stages: ['Seed Round'] }, p);
assert.deepEqual(edited.thesis.stages, ['Seed Round']);
assert.equal(edited.fromSurvey.has('Series A'), false);

// A removed chip loses its mark.
const removed = applyPrefill({ ...empty, regions: ['DACH'] }, p);
assert.equal(removed.fromSurvey.has('Europe'), false);

// Client-applied: a value the user picked themselves is never marked.
const own = applyPrefill({ ...empty, regions: ['Europe'] }, p);
assert.equal(own.fromSurvey.has('Europe'), false, 'user-picked Europe stays unmarked');
assert.equal(own.fromSurvey.has('Series A'), true, 'filled stage is marked');

// Server-applied (applied_at set): survey values still in the thesis are marked.
const server = applyPrefill({ ...empty, stages: ['Series A'], regions: ['Europe'] }, { ...p, applied_at: '2026-11-13' });
assert.deepEqual([...server.fromSurvey].sort(), ['Europe', 'Series A']);

// ── Walkthrough card placement ─────────────────────────────────────────────
const view = { width: 1280, height: 800 };
const cardSize = { width: 380, height: 220 };
// A sidebar item: card to its right, top-aligned.
assert.deepEqual(placeCard({ top: 200, left: 12, width: 220, height: 36 }, cardSize, view), { top: 200, left: 232 + CARD_GAP, side: 'right' });
// A top-bar button at the right edge: card below it, kept on screen.
const topRight = placeCard({ top: 14, left: 1100, width: 120, height: 32 }, cardSize, view);
assert.equal(topRight.side, 'below');
assert.equal(topRight.left, view.width - cardSize.width - VIEW_MARGIN);
// Near the bottom: the card moves up to stay inside the viewport.
assert.equal(placeCard({ top: 760, left: 12, width: 220, height: 30 }, cardSize, view).top, view.height - cardSize.height - VIEW_MARGIN);
// Two sections → one box around both.
assert.deepEqual(unionBox([{ top: 100, left: 10, width: 200, height: 50 }, { top: 170, left: 10, width: 220, height: 80 }]), { top: 100, left: 10, width: 220, height: 150 });
assert.equal(unionBox([]), null);

// ── Tour copy: shortcuts per device, first name only ───────────────────────
assert.equal(deviceOf('MacIntel'), 'mac');
assert.equal(deviceOf('macOS'), 'mac');
assert.equal(deviceOf('Win32'), 'windows');
assert.equal(deviceOf('Windows'), 'windows');
assert.equal(deviceOf('Linux x86_64'), 'windows', 'Linux uses Ctrl');
assert.equal(deviceOf('Linux armv8l Android'), 'unknown');
assert.equal(deviceOf(''), 'unknown');
assert.equal(shortcut('J', 'mac'), '⌘J');
assert.equal(shortcut('K', 'windows'), 'Ctrl+K');
assert.equal(shortcut('K', 'unknown'), '⌘K (Mac) or Ctrl+K (Windows)');
assert.equal(welcomeName('Rohn', false, 'rohn@x.com'), 'Rohn', 'a real full name that matches the handle stays');
assert.equal(welcomeName('rohnm', true, 'rohnm@x.com'), null, 'display name = email handle is dropped');
assert.equal(welcomeName('Alex', true, 'rohnm@x.com'), 'Alex');
assert.equal(welcomeName(null, false, 'a@b.com'), null);

console.log('benchmark rules: ok');
