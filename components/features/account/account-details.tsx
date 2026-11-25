'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR, { mutate } from 'swr';
import { toast } from 'sonner';
import { Button, Card, Field, Input, Loading } from '@/components/atlas';
import { Chip } from '@/components/explore/interests-editor';
import { AmountInput } from '@/components/features/amount/amount-input';
import { LocationSelect } from '@/components/features/location/location-select';
import { CityInput } from '@/components/features/location/city-input';
import { VerifyButton } from '@/components/features/verify/verify-cta';
import { getUserType, useUserProfile } from '@/hooks/use-user-profile';
import { INVESTOR_TYPE } from '@/components/scout/thesis-codec';
import { convert, displayCurrency } from '@/lib/currency';
import { apiRequest } from '@/lib/query-client';
import { refreshScout } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import {
	ORG_TYPES, needsMove, profilePatch, readDetails, sameDetails, scoutPatch,
	type AccountDetails, type ScoutRecord,
} from './account-details-model';

/** Saved label for the Scout record's investor type (Corporate VC and Accelerator share an enum value). */
function typeLabelOf(s: ScoutRecord): string {
	if (s.investor_type_label && INVESTOR_TYPE[s.investor_type_label] === s.investor_type) return s.investor_type_label;
	return Object.entries(INVESTOR_TYPE).find(([, v]) => v === s.investor_type)?.[0] ?? '';
}

/** The Account details and one save for them, shared by the Profile and Organisation cards. */
export function useAccountDetails() {
	const { data: profile } = useUserProfile();
	const scout = getUserType(profile) === 'scout';
	const { data: scoutRow, mutate: refetchScout } = useSWR<ScoutRecord | null>(scout ? qk.scout.profile() : null);
	// Wait for the Scout record too: until it loads the fields read empty, and an
	// edit typed in that moment would save the empties over the real values.
	const ready = !!profile && (!scout || scoutRow !== undefined);
	const saved = useMemo(() => readDetails(profile, scoutRow, typeLabelOf), [profile, scoutRow]);
	const [draft, setDraft] = useState<AccountDetails | null>(null);
	const [busy, setBusy] = useState(false);
	const value = draft ?? saved;
	const dirty = !!draft && !sameDetails(draft, saved);

	// Values that only exist on the old Scout record are copied onto the
	// account once, so they no longer depend on that fallback (D1, 1.5 / 3.3).
	const moved = useRef(false);
	useEffect(() => {
		if (!ready || moved.current || !needsMove(profile, saved)) return;
		moved.current = true;
		void apiRequest('PATCH', '/api/me', profilePatch(saved, profile?.dashboard_config))
			.then((r) => (r.ok ? mutate(qk.profile()) : undefined))
			.catch(() => { /* retried next visit */ });
	}, [ready, profile, saved]);

	const save = async () => {
		setBusy(true);
		try {
			const me = await apiRequest('PATCH', '/api/me', profilePatch(value, profile?.dashboard_config));
			if (!me.ok) throw new Error(String(me.status));
			if (scout) {
				const usd = (m: AccountDetails['org']['size']) => (m.amount ? convert(m.amount, m.currency, 'USD') : null);
				const s = await apiRequest('PATCH', '/api/scout', scoutPatch(value, INVESTOR_TYPE, usd));
				if (!s.ok) throw new Error(String(s.status));
				await refetchScout();
				void refreshScout();
			}
			await mutate(qk.profile());
			setDraft(null);
			toast.success('Account saved.');
		} catch {
			toast.error('Could not save your account. Try again.');
		} finally { setBusy(false); }
	};

	return { ready, value, set: (next: AccountDetails) => setDraft(next), dirty, busy, save };
}

type Details = ReturnType<typeof useAccountDetails>;

/** Role and LinkedIn, under name and email in the Profile card. */
export function ProfileDetailFields({ d }: { d: Details }) {
	if (!d.ready) return null;
	const v = d.value;
	return (
		<>
			<Field label="Role"><Input value={v.role} onChange={(e) => d.set({ ...v, role: e.target.value })} placeholder="e.g. Partner" maxLength={200} /></Field>
			<Field label="LinkedIn"><Input type="url" value={v.linkedin} onChange={(e) => d.set({ ...v, linkedin: e.target.value })} placeholder="linkedin.com/in/…" /></Field>
		</>
	);
}

export function SaveRow({ d }: { d: Details }) {
	if (!d.ready) return null;
	return (
		<div className="acct-save">
			<Button size="sm" disabled={!d.dirty || d.busy} onClick={() => void d.save()}>{d.busy ? 'Saving…' : d.dirty ? 'Save' : 'Saved'}</Button>
		</div>
	);
}

/**
 * Organisation (D1, 1.5): name, type, website, headquarters and size, with
 * Verify ownership. Replaces the old Verification box, which it now holds.
 */
export function OrganisationCard({ d }: { d: Details }) {
	if (!d.ready) return <Card><div className="acct-card__title">Organisation</div><Loading /></Card>;
	return <OrganisationFields d={d} />;
}

function OrganisationFields({ d }: { d: Details }) {
	const v = d.value;
	const o = v.org;
	const setOrg = (p: Partial<AccountDetails['org']>) => d.set({ ...v, org: { ...o, ...p } });
	// Stored in the currency active when it was typed, with that currency (9);
	// shown in the active one. Typing in another currency moves it into that one.
	const sizeCurrency = o.size.amount ? o.size.currency : displayCurrency();
	const typedIn = displayCurrency();

	return (
		<Card>
			<div className="acct-card__title">Organisation</div>
			<p className="acct-card__sub">Your fund, accelerator or company.</p>
			<div className="acct-grid">
				<Field label="Name"><Input value={o.name} onChange={(e) => setOrg({ name: e.target.value })} placeholder="e.g. Northline Ventures" maxLength={200} /></Field>
				<Field label="Website"><Input type="url" value={o.website} onChange={(e) => setOrg({ website: e.target.value })} placeholder="northline.vc" /></Field>
				<Field label="Country"><LocationSelect value={o.country} onChange={(country) => setOrg({ country })} /></Field>
				<Field label="City"><CityInput value={o.city} onChange={(city) => setOrg({ city })} onPick={(h) => { if (h.country) setOrg({ city: h.city ?? o.city, country: h.country }); }} geo={o.country} /></Field>
			</div>
			<div className="acct-field">
				<div className="acct-field__label">Type</div>
				<div className="int-chips">
					{ORG_TYPES.map((t) => <Chip key={t} on={o.type === t} onClick={() => setOrg({ type: o.type === t ? '' : t })}>{t}</Chip>)}
				</div>
			</div>
			<div className="acct-field">
				<div className="acct-field__label">Size <span>· fund size or assets under management</span></div>
				<AmountInput
					ariaLabel="Organisation size"
					storeCurrency={sizeCurrency}
					value={o.size.amount}
					onChange={(amount) => setOrg({ size: { amount: amount == null ? null : Math.round(convert(amount, sizeCurrency, typedIn)), currency: typedIn } })}
					placeholder={20000000}
				/>
			</div>
			<div className="acct-verify">
				<p>Verify ownership to keep your organisation’s details accurate on Atlas.</p>
				<VerifyButton label="Verify ownership" />
			</div>
			<SaveRow d={d} />
		</Card>
	);
}
