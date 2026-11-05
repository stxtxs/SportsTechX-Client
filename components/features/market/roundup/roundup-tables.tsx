'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import useSWR from 'swr';
import { Card, Loading, Logo, Flag } from '@/components/atlas';
import { fetcher } from '@/lib/query-client';
import { qk } from '@/lib/query-keys';
import { companyHref } from '@/lib/routes';
import type { Deal } from '@/types/api';
import { fmtM } from './roundup-format';

const PAGE = 200;

/** Subset of /api/acquisitions the M&A table reads. */
interface AcqRow {
	id: string; amount_usd: number | string | null;
	acquiree_name: string | null; acquiree_slug: string | null; acquiree_website: string | null; acquiree_logo: string | null;
	hq_city: string | null; hq_country: string | null;
	acquirer_name: string | null; acquirer_website: string | null; acquirer_logo: string | null;
	acquirer_city: string | null; acquirer_country: string | null;
}

/** Every funding round in [from, to]: the list endpoint caps a page at 200, so walk the offsets until `total`. */
async function fetchAllDeals(from: string, to: string): Promise<Deal[]> {
	const out: Deal[] = [];
	for (let offset = 0; ; offset += PAGE) {
		const page = await fetcher<{ data: Deal[]; total: number }>(qk.deals.list({ from, to, sort: '-amount_usd', limit: PAGE, offset }));
		if (!page) return out;
		out.push(...page.data);
		if (page.data.length < PAGE || out.length >= page.total) return out;
	}
}

const pad = (n: number) => String(n).padStart(2, '0');
function monthRange(year: number, month: number) {
	// `to` is inclusive server-side → the month's last day, never the 1st of the next.
	return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(new Date(Date.UTC(year, month, 0)).getUTCDate())}` };
}

/** IH "Funding Rounds": every round of the month, largest first. */
export function FundingRoundsTable({ year, month }: { year: number; month: number }) {
	const { from, to } = monthRange(year, month);
	const { data, isLoading } = useSWR<Deal[]>(['roundup:all-rounds', from, to], () => fetchAllDeals(from, to));
	return (
		<Shell title="Funding Rounds" subtitle="All funding rounds for the selected month, sorted by amount">
			{isLoading ? <Loading /> : !data?.length ? <Empty /> : (
				<div className="atlas-table">
					<Head cols={['Location', 'Round']} />
					{data.map((d, i) => (
						<Row key={d.id} i={i} href={d.company_id ? companyHref(d.company_slug ?? d.company_id) : null}
							amount={Number(d.amount_usd) > 0 ? fmtM(Number(d.amount_usd)) : 'Undisclosed'}>
							<Party name={d.company_name} website={d.company_website} logo={d.company_custom_logo_url} />
							<Col><Place city={d.hq_city} country={d.hq_country} /></Col>
							<Col>{d.round_type_name || '-'}</Col>
						</Row>
					))}
				</div>
			)}
		</Shell>
	);
}

/** IH "M&A - Disclosed & Undisclosed": the month's 50 largest acquisitions. */
export function MaDealsTable({ year, month }: { year: number; month: number }) {
	const { from, to } = monthRange(year, month);
	const { data, isLoading } = useSWR<{ data: AcqRow[] }>(qk.acquisitions.list({ from, to, sort: '-amount_usd', limit: 50 }));
	const rows = data?.data ?? [];
	return (
		<Shell title="M&A - Disclosed & Undisclosed">
			{isLoading ? <Loading /> : !rows.length ? <Empty /> : (
				<div className="atlas-table">
					<Head cols={['Location', 'Acquirer', 'Location']} nameLabel="Acquiree" />
					{rows.map((a, i) => (
						<Row key={a.id} i={i} href={a.acquiree_slug ? companyHref(a.acquiree_slug) : null}
							amount={Number(a.amount_usd) ? fmtM(Number(a.amount_usd)) : 'Undisclosed'}>
							<Party name={a.acquiree_name} website={a.acquiree_website} logo={a.acquiree_logo} />
							<Col><Place city={a.hq_city} country={a.hq_country} /></Col>
							<Col wide><Party name={a.acquirer_name} website={a.acquirer_website} logo={a.acquirer_logo} small /></Col>
							<Col><Place city={a.acquirer_city} country={a.acquirer_country} /></Col>
						</Row>
					))}
				</div>
			)}
		</Shell>
	);
}

function Shell({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
	return (
		<Card style={{ padding: '28px 23px 8px' }}>
			<div style={{ fontFamily: 'var(--a-font)', fontSize: 18, fontWeight: 700, color: 'var(--a-ink)' }}>{title}</div>
			{subtitle && <div style={{ fontSize: 13, color: 'var(--a-muted)', marginTop: 4 }}>{subtitle}</div>}
			<div style={{ marginTop: 16 }}>{children}</div>
		</Card>
	);
}

const Empty = () => <div style={{ fontSize: 13, color: 'var(--a-faint)', padding: '8px 0 20px' }}>No deals recorded for this month.</div>;

const COL_W = 150, WIDE_W = 190;
function Head({ cols, nameLabel = 'Company' }: { cols: string[]; nameLabel?: string }) {
	return (
		<div className="atlas-table__head">
			<span className="atlas-table__rank">#</span>
			<span className="atlas-table__name">{nameLabel}</span>
			{cols.map((c, i) => <span key={i} className="atlas-table__col hide-sm" style={{ width: c === 'Acquirer' ? WIDE_W : COL_W }}>{c}</span>)}
			<span className="atlas-table__amount" style={{ width: 90 }}>Amount</span>
		</div>
	);
}

function Row({ i, href, amount, children }: { i: number; href: string | null; amount: string; children: ReactNode[] }) {
	const [name, ...cols] = children;
	const body = (
		<>
			<span className="atlas-table__rank">{i + 1}</span>
			<span className="atlas-table__name">{name}</span>
			{cols}
			<span className="atlas-table__amount" style={{ width: 90 }}>{amount}</span>
		</>
	);
	// IH opened the company panel on row click; Atlas goes to the company page.
	return href ? <Link href={href} className="atlas-table__row">{body}</Link> : <div className="atlas-table__row">{body}</div>;
}

const Col = ({ children, wide }: { children: ReactNode; wide?: boolean }) => (
	<span className="atlas-table__col hide-sm" style={{ width: wide ? WIDE_W : COL_W }}>{children}</span>
);

/** IH location cell: flag + city, else country. */
function Place({ city, country }: { city: string | null; country: string | null }) {
	const txt = city || country;
	if (!txt) return <>-</>;
	return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}><Flag cc={country} size={16} /><span className="atlas-ellipsis">{txt}</span></span>;
}

/** Logo (custom → favicon → initials) + name, like IH's CompanyLogoCell. */
function Party({ name, website, logo, small }: { name: string | null; website: string | null; logo: string | null; small?: boolean }) {
	return (
		<span style={{ display: 'inline-flex', alignItems: 'center', gap: small ? 8 : 12, minWidth: 0, maxWidth: '100%' }}>
			<Logo co={{ name, website, custom_logo_url: logo }} size={small ? 22 : 32} />
			<span className="atlas-ellipsis" style={small ? undefined : { fontFamily: 'var(--a-font)', fontWeight: 700, fontSize: 15, color: 'var(--a-ink)' }}>{name || '-'}</span>
		</span>
	);
}
