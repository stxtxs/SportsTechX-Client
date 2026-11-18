/**
 * Checks for the Pin to Home rules (fix brief N1). Run: `node components/features/pins/rules.check.ts`.
 */
import assert from 'node:assert/strict';
import { EMPTY_PINS, MAX_PINS, addPin, homePins, removePin, type Pin, type PinState, type PinTarget } from './rules.ts';

const t = (slug: string, kind: PinTarget['kind'] = 'report'): PinTarget => ({ key: `${kind}:${slug}`, kind, title: slug, href: `/${slug}` });
const ATLAS: Pin[] = [{ ...t('ftabr26'), pinned_at: '2026-11-17T00:00:00.000Z', by_atlas: true }];

const pinAll = (state: PinState, slugs: string[], start = 18): PinState => slugs.reduce((s, slug, i) => {
	const r = addPin(s, t(slug), ATLAS, `2026-11-${start + i}T00:00:00.000Z`);
	assert.ok(r.ok, `pinning ${slug} should work`);
	return r.state;
}, state);

// A new user sees the SportsTechX pin.
assert.deepEqual(homePins(EMPTY_PINS, ATLAS).map((p) => p.key), ['report:ftabr26']);

// Newest first; the SportsTechX pin counts toward four.
const three = pinAll(EMPTY_PINS, ['a', 'b', 'c']);
assert.deepEqual(homePins(three, ATLAS).map((p) => p.key), ['report:c', 'report:b', 'report:a', 'report:ftabr26']);

// A fifth is refused, and the state is left as it was.
const fifth = addPin(three, t('d'), ATLAS, '2026-11-30T00:00:00.000Z');
assert.deepEqual(fifth, { ok: false, reason: 'limit' });
assert.equal(homePins(three, ATLAS).length, MAX_PINS);

// Pinning something already pinned changes nothing.
const again = addPin(three, t('a'), ATLAS, '2026-11-30T00:00:00.000Z');
assert.ok(again.ok && again.state === three);

// Unpinning the SportsTechX pin keeps it off, and frees a slot.
const noAtlas = removePin(three, 'report:ftabr26', ATLAS);
assert.deepEqual(noAtlas.dismissed, ['report:ftabr26']);
assert.equal(homePins(noAtlas, ATLAS).some((p) => p.key === 'report:ftabr26'), false);
const four = addPin(noAtlas, t('d'), ATLAS, '2026-11-30T00:00:00.000Z');
assert.ok(four.ok);
assert.equal(homePins(four.state, ATLAS)[0].key, 'report:d');

// Pinning the SportsTechX item back clears the dismissal and puts it on top.
const back = addPin(noAtlas, t('ftabr26'), ATLAS, '2026-12-01T00:00:00.000Z');
assert.ok(back.ok);
assert.equal(back.state.dismissed.includes('report:ftabr26'), false);
assert.equal(homePins(back.state, ATLAS)[0].key, 'report:ftabr26');

// Unpinning one of the user's own pins removes only that one; nothing is changed in place.
const before = JSON.stringify(three);
const lessB = removePin(three, 'report:b', ATLAS);
assert.deepEqual(homePins(lessB, ATLAS).map((p) => p.key), ['report:c', 'report:a', 'report:ftabr26']);
assert.equal(JSON.stringify(three), before);

console.log('pins rules: ok');
