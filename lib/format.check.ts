/** Self-check for lib/format.ts. Run: node lib/format.check.ts */
import assert from 'node:assert/strict';
import { fmtAmount, fmtFullDate, fmtMonth, shortcut } from './format.ts';
import { convert, usdPerEur } from './currency.ts';

assert.equal(fmtAmount(333_000), '$0.33M');
assert.equal(fmtAmount(9_700_000), '$9.70M');
assert.equal(fmtAmount(3_000_000), '$3.00M');
assert.equal(fmtAmount(2_000_000_000), '$2.00B');
assert.equal(fmtAmount(65_700_000_000), '$65.70B');
// Display currency is USD outside a browser, so EUR figures convert (lib/currency.ts).
assert.equal(fmtAmount(5_000_000, 'EUR', '—', 2024), '$5.41M', 'EUR shown in USD at the 2024 average');
assert.equal(convert(1_082_400, 'USD', 'EUR', 2024), 1_000_000);
assert.equal(usdPerEur(1990), usdPerEur(2010), 'years before the table clamp to the first');
assert.equal(usdPerEur(null), usdPerEur(2026), 'no year uses the latest');
assert.equal(fmtAmount(5_000_000, 'GBP'), '£5.00M', 'other currencies are not converted');
assert.equal(fmtAmount('1300000000'), '$1.30B');
assert.equal(fmtAmount(null), '—');
assert.equal(fmtAmount(0, 'USD', 'Undisclosed'), 'Undisclosed');
assert.equal(fmtFullDate('2026-11-04'), 'Nov 04, 2026');
assert.equal(fmtFullDate('2026-05-01'), 'May 01, 2026');
assert.equal(fmtFullDate('2027-03-31'), 'Mar 31, 2027');
assert.equal(fmtMonth('2026-11-04'), 'Nov 2026');
assert.equal(fmtFullDate(null), '—');
assert.equal(shortcut('/'), '⌘/ / Ctrl+/');
console.log('PASS format');
