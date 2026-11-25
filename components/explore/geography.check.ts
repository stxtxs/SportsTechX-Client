/** Self-check for components/explore/geography.ts. Run: node components/explore/geography.check.ts */
import assert from 'node:assert/strict';
import { GLOBAL, geosToThesis, normaliseGeos, toggleGeo } from './geography.ts';

// Global is exclusive both ways.
assert.deepEqual(toggleGeo(['Europe', 'India'], GLOBAL), [GLOBAL]);
assert.deepEqual(toggleGeo([GLOBAL], 'Europe'), ['Europe']);
assert.deepEqual(toggleGeo([GLOBAL], GLOBAL), []);
assert.deepEqual(toggleGeo(['Europe'], 'Europe'), []);

// Old picks mapped across.
assert.deepEqual(normaliseGeos(['DACH']), ['Germany', 'Austria', 'Switzerland']);
assert.deepEqual(normaliseGeos(['United Kingdom', 'India']), ['United Kingdom', 'India'], 'UK and India are countries already');
assert.ok(normaliseGeos(['Middle East']).includes('United Arab Emirates'));
assert.deepEqual(normaliseGeos(['Europe', 'DACH', 'Germany']), ['Europe', 'Germany', 'Austria', 'Switzerland'], 'no duplicates');
assert.deepEqual(normaliseGeos(['Global', 'Europe']), ['Europe'], 'a place beats Global');

// Thesis scopes.
assert.deepEqual(geosToThesis(['Global', 'Europe', 'Germany']), [
	{ scope_type: 'continent', scope_value: 'Global' },
	{ scope_type: 'continent', scope_value: 'Europe' },
	{ scope_type: 'country', scope_value: 'Germany' },
]);

console.log('PASS geography');
