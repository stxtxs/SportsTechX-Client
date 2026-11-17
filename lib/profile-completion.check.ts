/** Self-check for lib/profile-completion.ts. Run: node lib/profile-completion.check.ts */
import assert from 'node:assert/strict';
import { preferencesPct, raisePct, setupDone, thesisPct } from './profile-completion.ts';

assert.equal(preferencesPct({}), 0);
assert.equal(preferencesPct({ goals: ['a'], sectors: ['s'], geos: ['g'], sports: ['x'], techs: [] }), 80);
assert.equal(setupDone(80), true);
assert.equal(setupDone(79), false);
assert.equal(thesisPct({ fundName: 'F', investorType: 'VC', stages: ['Seed'], chequeMin: '1', invStyle: 'Lead', traction: '', include: [], exclude: [] }), 63);
assert.equal(raisePct({ company_name: 'A', company_website: 'a.com', hq_city: 'Berlin', company_stage: 'seed', company_description: 'x', round_type: 'seed', target_amount: 1, target_close_date: '2027-01-01' }, { investor_types: ['vc'], cheque_max: 5 }), 100);
assert.equal(raisePct(null, null), 0);
assert.equal(raisePct({}, { cheque_min: 0, cheque_max: 0 }), 0, 'a 0 cheque is not set');
assert.equal(thesisPct({ chequeMin: '€250k' }), 13, 'a thesis cheque string counts');
console.log('PASS profile-completion');
