'use client';

import { useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button, Seg } from '@/components/atlas';
import { displayCurrency, setDisplayCurrency, subscribeCurrency, type DisplayCurrency } from '@/lib/currency';
import { AccountTabs, CompletionBadge } from '@/components/features/account/account-tabs';
import { preferencesPct } from '@/lib/profile-completion';
import { NO_INTERESTS, useInterests, type Interests } from './interests';
import { InterestsEditor } from './interests-editor';

/**
 * Interests — what Atlas prioritises on Home.
 *
 * Everything shown persists to the account via `PUT /api/explore/interests`
 * (sectors, sports, technologies, regions, goals). The save bar is pinned to the bottom of
 * the content area so Save never sits below the fold.
 */
export function InterestsPage() {
	const { value: saved, save } = useInterests();
	const [draft, setDraft] = useState<Interests | null>(null);
	const [busy, setBusy] = useState(false);
	const value = draft ?? saved;
	const total = value.goals.length + value.sectors.length + value.subs.length + value.geos.length + value.sports.length + value.techs.length;

	return (
		<>
			<AccountTabs actions={<CompletionBadge pct={preferencesPct(saved)} />} />
			<CurrencySetting />
			<InterestsEditor value={value} onChange={setDraft} />
			<div className="int-savebar">
				<span className="int-savebar__count">{total ? `${total} selected` : 'Nothing selected: you see the entire market'}</span>
				<Button variant="outline" onClick={() => setDraft(NO_INTERESTS)} disabled={!total}>Reset to the entire market</Button>
				<Button
					disabled={!draft || busy}
					onClick={async () => {
						setBusy(true);
						try { await save(value); setDraft(null); toast.success('Preferences saved.'); }
						// A failed save used to clear the draft and claim success, so the
						// user lost their edits and was told they were kept.
						catch { toast.error('Could not save your preferences. Try again.'); }
						finally { setBusy(false); }
					}}
				>{busy ? 'Saving…' : draft ? 'Save preferences' : 'Saved'}</Button>
			</div>
		</>
	);
}

/**
 * USD or EUR for every amount on the platform (handover v1 §4 Formats; fix
 * list 1.5). Default USD. Saved at once, like a toggle, with the Preferences
 * toast. Stored in this browser until the account can hold it (backend note).
 */
function CurrencySetting() {
	const currency = useSyncExternalStore(subscribeCurrency, displayCurrency, () => 'USD' as DisplayCurrency);
	return (
		<section className="int-currency">
			<div>
				<h2 className="int-currency__title">Currency</h2>
				<p className="int-currency__sub">Every amount on Atlas, converted at the average rate of its year.</p>
			</div>
			<Seg<DisplayCurrency>
				ariaLabel="Currency"
				value={currency}
				onChange={(c) => { setDisplayCurrency(c); toast.success('Preferences saved.'); }}
				options={[{ key: 'USD', label: 'USD $' }, { key: 'EUR', label: 'EUR €' }]}
			/>
		</section>
	);
}
