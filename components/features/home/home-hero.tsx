'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { H1 } from '@/components/atlas';
import { AgentComposer } from '@/components/atlas/patterns/agent-composer';
import { greetingName, useUserProfile } from '@/hooks/use-user-profile';
import { ASK_PLACEHOLDER, ASK_SUGGESTIONS, HOME_SUBLINE, SETTINGS_LINK, greetingFor } from '@/lib/atlas-copy';
import { hrefOf } from '@/lib/routes';
import type { Tier } from '@/lib/access';
import './home-hero.css';

/**
 * The top of Home, identical on all three solutions (handover v1 §4 Home, B1):
 * greeting with the first name only when one exists, the one subline, the
 * settings link in the same place, and the Ask Atlas box with its three
 * suggestions on one line. Only the copy differs, and it comes from §5.
 */
export function HomeHero({ tier, settingsMeta, below }: {
	tier: Tier;
	/** A short count beside the settings link, e.g. "80%". */
	settingsMeta?: ReactNode;
	/** Solution-specific content under the composer (Scout's thesis tags). */
	below?: ReactNode;
}) {
	const router = useRouter();
	const { data: profile } = useUserProfile();
	const [q, setQ] = useState('');
	const first = greetingName(profile);
	const greeting = greetingFor(new Date().getHours());
	const settings = SETTINGS_LINK[tier];
	const goChat = (text: string) => {
		const t = text.trim();
		if (t) router.push(`${hrefOf('chat')}?q=${encodeURIComponent(t)}`);
	};

	return (
		<section className="home-hero">
			<H1>{first ? `${greeting}, ${first}` : `${greeting}.`}</H1>
			<div className="home-hero__sub">
				<span>{HOME_SUBLINE}</span>
				<Link href={hrefOf(settings.id)} className="home-hero__settings">
					<SlidersHorizontal size={12} aria-hidden="true" />
					{settings.label}
					{settingsMeta != null && <b>{settingsMeta}</b>}
				</Link>
			</div>
			{below}
			<div className="home-hero__composer">
				<AgentComposer
					value={q}
					onChange={setQ}
					onSubmit={() => goChat(q)}
					placeholder={ASK_PLACEHOLDER[tier]}
					compact
					suggestions={ASK_SUGGESTIONS[tier]}
					onSuggestion={goChat}
				/>
			</div>
		</section>
	);
}
