/** Self-check for components/explore/headings.ts. Run: node components/explore/headings.check.ts */
import assert from 'node:assert/strict';
import { canonicalTag, collapse, findTag, groupTags, tagHeading, titleCase } from './headings.ts';

// Current names sit under the heading of their new name; removed tags have none.
assert.equal(tagHeading({ name: 'AI / ML' }), 'Technology');
assert.equal(tagHeading({ name: 'Sleep Optimization' }), 'Health');
assert.equal(tagHeading({ name: 'Mobile Apps' }), null, 'removed tags stay hidden');
assert.equal(tagHeading({ name: 'Mobile Apps', display_heading: 'Technology' }), 'Technology', 'the API field wins');
assert.equal(canonicalTag('P2E (play to earn)'), 'Rewards');

// Headings in order, tags in the order of section 2.
const groups = groupTags([
	{ id: '1', name: 'Gym Tech' }, { id: '2', name: 'Web3' }, { id: '3', name: 'AI / ML' }, { id: '4', name: 'API' },
]);
assert.deepEqual(groups.map((g) => g.heading), ['Technology', 'Health']);
assert.deepEqual(groups[0]!.tags.map((t) => t.name), ['AI / ML', 'Web3']);

// A merged-in tag never stands for the new name; the renamed one does.
const rows = [{ name: 'AI / ML' }, { name: 'Chatbot' }, { name: 'NFT / Blockchain' }, { name: 'Tokens & Crypto' }, { name: 'Web3' }];
assert.equal(findTag(rows, 'AI')?.name, 'AI / ML');
assert.equal(findTag(rows, 'Web3')?.name, 'Web3');

assert.equal(titleCase('Fitness & endurance'), 'Fitness & Endurance');

// A full heading is one pill; a partial one shows its items.
assert.deepEqual(collapse(['a', 'b', 'c'], [{ label: 'AB', values: ['a', 'b'] }]), [
	{ label: 'AB', values: ['a', 'b'] }, { label: 'c', values: ['c'] },
]);
assert.deepEqual(collapse(['a'], [{ label: 'AB', values: ['a', 'b'] }]), [{ label: 'a', values: ['a'] }]);

console.log('PASS headings');
