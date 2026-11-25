'use client';

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import { Button, Loading, Seg } from '@/components/atlas';
import { displayCurrency, setDisplayCurrency, subscribeCurrency, type DisplayCurrency } from '@/lib/currency';
import { apiRequest } from '@/lib/query-client';
import { refreshAccount } from '@/lib/invalidate';
import { AccountTabs, CompletionBadge } from '@/components/features/account/account-tabs';
import { preferencesPct, scoutPreferencesPct } from '@/lib/profile-completion';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { ScoutingFocus } from '@/components/scout/scouting-focus';
import { NO_FOCUS, type ScoutFocus } from '@/components/scout/scout-focus';
import { useScoutFocus, type ThesisCarryOver } from '@/components/scout/use-scout-focus';
import { NO_INTERESTS, useInterestOptions, useInterests, type Interests } from './interests';
import { InterestsEditor } from './interests-editor';
import { normaliseGeos } from './geography';

/**
 * Preferences: what Atlas prioritises, one page on all three solutions.
 *
 * Everything persists to the account via `PUT /api/explore/interests`. On
 * Scout the page ends with the Scouting focus block (D1, 1.1), also written to
 * the Scout thesis; that first save is Scout's setup, as there is no wizard.
 *
 * One way to save (Preferences second pass, 5): every change saves itself
 * shortly after you stop, and the state shows beside the completion %. The
 * page shows nothing until everything it reads has loaded, so it never flashes
 * "0% complete" or "Nothing selected" (7).
 */
const SAVE_DELAY_MS = 700;
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function InterestsPage() {
	const { data: profile } = useUserProfile();
	const scout = getUserType(profile) === 'scout';
	const { value: saved, save, isLoading: prefsLoading } = useInterests();
	const sf = useScoutFocus(scout);
	const opts = useInterestOptions();
	const techName = useMemo(() => new Map(opts.techs.options), [opts.techs.options]);
	const ready = !!profile && !prefsLoading && !sf.isLoading && opts.sectors.options.length > 0 && opts.techs.options.length > 0;

	// What the page opens on: the saved Preferences with old picks mapped across
	// (3) and, for a Scout with empty Preferences, their thesis carried over (D1, 3.3).
	const initial = useMemo(() => (ready ? migrate(saved, scout ? sf.carry : null, opts) : null), [ready, saved, scout, sf.carry, opts]);

	const [draft, setDraft] = useState<Interests | null>(null);
	const [focusDraft, setFocusDraft] = useState<ScoutFocus | null>(null);
	const [state, setState] = useState<SaveState>('idle');
	const value = draft ?? initial?.prefs ?? saved;
	const focus = focusDraft ?? (scout ? sf.focus : NO_FOCUS);

	const persist = useCallback(async (p: Interests, f: ScoutFocus) => {
		setState('saving');
		try {
			await save(p);
			if (scout) await sf.save(p, p.techs.map((id) => techName.get(id)).filter((n): n is string => !!n), f);
			setState('saved');
		} catch {
			setState('error');
			toast.error('Could not save your preferences. Try again.');
		}
	}, [save, scout, sf, techName]);

	// Debounced, and flushed if the page closes before the delay is up. `flush`
	// is stable (it reads the latest `persist` from a ref), so the unmount
	// cleanup below runs once, on leaving, not on every render.
	const persistRef = useRef(persist);
	useEffect(() => { persistRef.current = persist; }, [persist]);
	const pending = useRef<{ p: Interests; f: ScoutFocus } | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const flush = useCallback(() => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = null;
		const next = pending.current;
		pending.current = null;
		if (next) void persistRef.current(next.p, next.f);
	}, []);
	const schedule = (p: Interests, f: ScoutFocus) => {
		// The thesis refuses a minimum above the maximum; hold the save until it's fixed.
		if (f.chequeMin != null && f.chequeMax != null && f.chequeMin > f.chequeMax) return;
		pending.current = { p, f };
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(flush, SAVE_DELAY_MS);
	};
	useEffect(() => () => flush(), [flush]);

	// Mapped or carried-over values are saved once, so the account holds them.
	const migrated = useRef(false);
	useEffect(() => {
		if (!initial || !(initial.changed || (scout && sf.renamed)) || migrated.current) return;
		migrated.current = true;
		pending.current = { p: initial.prefs, f: focus };
		timer.current = setTimeout(flush, 0);
	}, [initial, focus, flush, scout, sf.renamed]);

	const onPrefs = (next: Interests) => { setDraft(next); schedule(next, focus); };
	const onFocus = (next: ScoutFocus) => { setFocusDraft(next); schedule(value, next); };
	// Tags → Avoid lives on the Scout thesis; a pick that moves sides changes both.
	const avoid = scout ? {
		value: focus.exclude,
		onChange: (exclude: string[], prefs: Interests) => {
			const f = { ...focus, exclude };
			setDraft(prefs);
			setFocusDraft(f);
			schedule(prefs, f);
		},
	} : undefined;

	if (!ready) {
		return <><AccountTabs /><Loading /></>;
	}

	const total = value.goals.length + value.sectors.length + value.subs.length + value.geos.length + value.sports.length + value.techs.length + value.models.length;
	// Tags counts business models as well as tags.
	const tagged = { ...value, techs: [...value.techs, ...value.models] };
	const pct = scout ? scoutPreferencesPct(tagged, focus) : preferencesPct(tagged);

	return (
		<>
			<AccountTabs actions={<><CompletionBadge pct={pct} /><SaveStatus state={state} /></>} />
			<CurrencySetting />
			<InterestsEditor value={value} onChange={onPrefs} avoid={avoid} />
			{scout && <div className="int-editor"><ScoutingFocus value={focus} onChange={onFocus} /></div>}
			<div className="int-savebar">
				<Button variant="outline" onClick={() => onPrefs(NO_INTERESTS)} disabled={!total}>Reset to the entire market</Button>
			</div>
		</>
	);
}

function SaveStatus({ state }: { state: SaveState }) {
	if (state === 'idle') return null;
	return (
		<span className={state === 'error' ? 'int-savestate int-savestate--error' : 'int-savestate'} role="status">
			{state === 'saving' ? 'Saving…' : state === 'saved' ? 'Saved' : 'Not saved'}
		</span>
	);
}

/**
 * Saved Preferences with old picks mapped across, plus a Scout's thesis when
 * Preferences is empty, and the thesis's old "looks for" as Tags → Include
 * the first time (Preferences has never held business models before).
 */
function migrate(
	saved: Interests,
	c: ThesisCarryOver | null,
	opts: ReturnType<typeof useInterestOptions>,
): { prefs: Interests; changed: boolean } {
	let prefs: Interests = { ...saved, geos: normaliseGeos(saved.geos) };
	const tagId = new Map(opts.techs.options.map(([id, n]) => [n.toLowerCase(), id]));
	const prefsEmpty = !saved.sectors.length && !saved.subs.length && !saved.geos.length && !saved.sports.length;
	if (c && prefsEmpty && (c.sectorIds.length || c.geos.length || c.sportIds.length)) {
		const topIds = new Set(opts.sectors.options.map(([id]) => id));
		prefs = {
			...prefs,
			sectors: c.sectorIds.filter((id) => topIds.has(id)),
			subs: c.sectorIds.filter((id) => !topIds.has(id)),
			sports: c.sportIds,
			geos: c.geos,
		};
	}
	if (c && !saved.models.length && (c.models.length || c.tagNames.length)) {
		const ids = c.tagNames.map((n) => tagId.get(n.toLowerCase())).filter((id): id is string => !!id);
		prefs = { ...prefs, models: c.models, techs: [...new Set([...prefs.techs, ...ids])] };
	}
	return { prefs, changed: JSON.stringify(prefs) !== JSON.stringify(saved) };
}

/**
 * USD or EUR for every amount on the platform (handover v1 §4 Formats; fix
 * list 1.5). Default USD. Saved at once, like a toggle, with the Preferences
 * toast. Saved on the account (PATCH /api/me), so it follows the user to every device.
 */
/** Apply at once, save to the account, and put the old value back if the save fails. */
async function saveCurrency(next: DisplayCurrency, prev: DisplayCurrency): Promise<void> {
	if (next === prev) return;
	setDisplayCurrency(next);
	try {
		await apiRequest('PATCH', '/api/me', { display_currency: next });
		toast.success('Preferences saved.');
		void refreshAccount();
	} catch {
		setDisplayCurrency(prev);
		toast.error('Couldn’t save your currency. Try again.');
	}
}

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
				onChange={(c) => void saveCurrency(c, currency)}
				options={[{ key: 'USD', label: 'USD $' }, { key: 'EUR', label: 'EUR €' }]}
			/>
		</section>
	);
}
