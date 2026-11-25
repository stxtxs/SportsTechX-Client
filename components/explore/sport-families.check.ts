/** Self-check for components/explore/sport-families.ts. Run: node components/explore/sport-families.check.ts */
import assert from 'node:assert/strict';
import { collapseSports, expandSports, familiesFromTree } from './sport-families.ts';

const fams = familiesFromTree([
	{ id: 'R', name: 'Racket Sports', children: [{ id: 'tennis', name: 'Tennis' }, { id: 'padel', name: 'Padel' }] },
	{ id: 'T', name: 'Team Sports', children: [{ id: 'rugby', name: 'Rugby' }, { id: 'cricket', name: 'Cricket' }] },
	{ id: 'golf', name: 'Golf', children: [] },
]);
assert.deepEqual(fams.map((f) => f.name), ['Team Sports', 'Racket Sports'], "Rohn's order; a sport with no children is not a heading");

// A fully ticked heading is saved as the heading; a partly ticked one as its sports.
assert.deepEqual(collapseSports(['rugby', 'cricket', 'tennis'], fams), ['T', 'tennis']);
assert.deepEqual(collapseSports(['golf'], fams), ['golf']);
// On load a saved heading expands back into its sports (so a sport added later is included).
assert.deepEqual(expandSports(['T', 'tennis'], fams), ['rugby', 'cricket', 'tennis']);
// Round trip, and nothing lost before the families have loaded.
assert.deepEqual(expandSports(collapseSports(['rugby', 'cricket', 'padel'], fams), fams).sort(), ['cricket', 'padel', 'rugby']);
assert.deepEqual(collapseSports(['rugby', 'cricket'], []), ['rugby', 'cricket']);
assert.deepEqual(expandSports(['T'], []), ['T']);
console.log('PASS sport-families');
