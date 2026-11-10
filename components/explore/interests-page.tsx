'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button, PageHead } from '@/components/atlas';
import { NO_INTERESTS, useInterests, type Interests } from './interests';
import { InterestsEditor } from './interests-editor';

/**
 * Interests — what Atlas prioritises on Home.
 *
 * Everything shown persists to the account via `PUT /api/explore/interests`
 * (sectors, sports, regions, goals), except Technologies, which the API can't
 * store yet and the editor says so. The save bar is pinned to the bottom of
 * the content area so Save never sits below the fold.
 */
export function InterestsPage() {
	const { value: saved, save } = useInterests();
	const [draft, setDraft] = useState<Interests | null>(null);
	const [busy, setBusy] = useState(false);
	const value = draft ?? saved;
	const total = value.goals.length + value.sectors.length + value.subs.length + value.geos.length + value.sports.length;

	return (
		<>
			<PageHead title="Interests" sub="Control what Atlas prioritises. Interests shape your homepage; they never limit what you can explore." />
			<InterestsEditor value={value} onChange={setDraft} />
			<div className="int-savebar">
				<span className="int-savebar__count">{total ? `${total} selected` : 'Nothing selected: you see the entire market'}</span>
				<Button variant="outline" onClick={() => setDraft(NO_INTERESTS)} disabled={!total}>Reset to the entire market</Button>
				<Button
					disabled={!draft || busy}
					onClick={async () => {
						setBusy(true);
						try { await save(value); setDraft(null); toast.success('Interests saved'); }
						// A failed save used to clear the draft and claim success, so the
						// user lost their edits and was told they were kept.
						catch { toast.error('Could not save your interests. Try again.'); }
						finally { setBusy(false); }
					}}
				>{busy ? 'Saving…' : draft ? 'Save interests' : 'Saved'}</Button>
			</div>
		</>
	);
}
