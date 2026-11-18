import assert from 'node:assert/strict';
import { toReportSectorKeys } from './sector-keys.ts';

const live = { sectorDrilldown: [{ sector: 'Fan Tech', sub_sector: 'Fan Engagement', total_m: 1 }], bySector: { 'Athlete Tech': 3, Other: 1 }, note: 'Fan Tech funding grew' };
assert.deepEqual(toReportSectorKeys(live), {
	sectorDrilldown: [{ sector: 'Fans & Content', sub_sector: 'Fan Engagement', total_m: 1 }],
	bySector: { 'Activity & Performance': 3, Other: 1 },
	note: 'Fan Tech funding grew',          // only exact names are translated, never text inside a sentence
});
assert.equal(toReportSectorKeys('Management & Organisation'), 'Management & Organisation');   // old names pass through
console.log('PASS gstvcr26 sector-keys');
