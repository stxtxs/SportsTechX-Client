/**
 * Self-check for the link-preview exception in the edge auth gate. Run it with:
 *   node lib/link-preview.check.ts
 *
 * Getting this wrong fails silently in one of two directions: shared report links
 * show the login card again, or bots get through on pages that aren't reports.
 */
import assert from 'node:assert/strict';
import { isLinkPreview } from './public-paths.ts';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const BOTS = [
	'LinkedInBot/1.0 (compatible; Mozilla/5.0; Apache-HttpClient +http://www.linkedin.com)',
	'Slackbot-LinkExpanding 1.0 (+https://api.slack.com/robots)',
	'Twitterbot/1.0',
	'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
	'WhatsApp/2.23.20.0',
	'Mozilla/5.0 (Windows NT 6.1; WOW64) SkypeUriPreview Preview/0.5',
];

for (const ua of BOTS) assert.equal(isLinkPreview('GET', '/reports/ftabr26', ua), true, ua);
assert.equal(isLinkPreview('HEAD', '/reports/ftabr26', BOTS[0]), true, 'HEAD allowed');

// real browsers and search crawlers stay gated
assert.equal(isLinkPreview('GET', '/reports/ftabr26', CHROME), false, 'browser');
assert.equal(isLinkPreview('GET', '/reports/ftabr26', null), false, 'no user agent');
assert.equal(isLinkPreview('GET', '/reports/ftabr26', 'Mozilla/5.0 (compatible; Googlebot/2.1)'), false, 'Googlebot');
// only report pages, only reads
assert.equal(isLinkPreview('GET', '/home', BOTS[0]), false, '/home');
assert.equal(isLinkPreview('GET', '/reports', BOTS[0]), false, 'library page');
assert.equal(isLinkPreview('GET', '/reportsx/ftabr26', BOTS[0]), false, 'prefix lookalike');
assert.equal(isLinkPreview('POST', '/reports/ftabr26', BOTS[0]), false, 'POST');

console.log('PASS');
