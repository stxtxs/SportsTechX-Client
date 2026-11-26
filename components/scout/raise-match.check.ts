/** Self-check for components/scout/raise-match.ts. Run: node components/scout/raise-match.check.ts */
import assert from 'node:assert/strict';
import { matchRaise, type MatchPrefs } from './raise-match.ts';

const prefs = (p: Partial<MatchPrefs> = {}): MatchPrefs => ({
	sectorNames: new Set(), geos: [], continentOf: new Map([['Germany', 'Europe'], ['United States', 'North America']]),
	stages: [], avoid: new Set(), include: new Set(), ...p,
});
const kinetiq = { sector: 'Wearables', company_hq: 'Berlin, Germany', round: 'Seed round' };

// Avoid hides a raise completely.
assert.deepEqual(matchRaise(kinetiq, prefs({ avoid: new Set(['wearables']) })), { hidden: true, pct: null, why: [] });

// Only filled-in preferences count; all three met is 100%, with the pills in order.
const all = matchRaise(kinetiq, prefs({ sectorNames: new Set(['wearables']), geos: ['Europe'], stages: ['Seed round'] }));
assert.deepEqual(all, { hidden: false, pct: 100, why: ['Wearables', 'Europe', 'Seed round'] });

// Two of three: 67%.
assert.equal(matchRaise(kinetiq, prefs({ sectorNames: new Set(['wearables']), geos: ['North America'], stages: ['Seed round'] })).pct, 67);

// A country pick matches the raise's country; Global matches anywhere.
assert.deepEqual(matchRaise(kinetiq, prefs({ geos: ['Germany'] })).why, ['Germany']);
assert.equal(matchRaise(kinetiq, prefs({ geos: ['Global'] })).pct, 100);

// A raise tagged with an avoided tag is hidden (Fanvault, Web3).
assert.equal(matchRaise({ sector: 'Fan Engagement', company_hq: 'Austin, United States', round: 'Series A', tags: ['Web3'] }, prefs({ avoid: new Set(['web3']) })).hidden, true);
// An included tag counts and shows as a pill.
assert.deepEqual(matchRaise({ ...kinetiq, tags: ['AI'] }, prefs({ include: new Set(['ai']) })), { hidden: false, pct: 100, why: ['AI'] });

// Nothing filled in: no score, no pills.
assert.deepEqual(matchRaise(kinetiq, prefs()), { hidden: false, pct: null, why: [] });

console.log('PASS raise-match');
