'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Files, Newspaper, BookOpen } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { FeedCard } from '@/components/atlas';
import { hrefOf } from '@/lib/routes';
import { usePins } from './use-pins';
import type { Pin, PinKind } from './rules';

/** Where each kind lives, for the card label and the unpin message. */
const SECTION: Record<PinKind, { tag: string; icon: LucideIcon; name: string; route: string }> = {
	report: { tag: 'Report', icon: Files, name: 'Reports', route: 'reports' },
	newsletter: { tag: 'Newsletter', icon: Newspaper, name: 'Newsletter', route: 'newsletter' },
	guide: { tag: 'Fundraising Guide', icon: BookOpen, name: 'the Fundraising Guide', route: 'guide' },
};

/**
 * Pinned items at the top of "Latest from Atlas" on every Home (fix brief N1):
 * marked "Pinned", with the filled pin beside "Open". Clicking the pin unpins
 * the item from Home only, and the message says where it still lives.
 */
export function PinnedFeedCards() {
	const router = useRouter();
	const { pins, unpin } = usePins();
	if (pins.length === 0) return null;

	const onUnpin = async (p: Pin) => {
		const s = SECTION[p.kind];
		if (!(await unpin(p.key))) return;
		toast(`Unpinned from Home. You’ll still find it in ${s.name}.`, {
			action: { label: `Go to ${s.name.replace(/^the /, '')}`, onClick: () => router.push(hrefOf(s.route)) },
		});
	};

	return (
		<>
			{pins.map((p) => {
				const s = SECTION[p.kind];
				return (
					<FeedCard
						key={p.key}
						tag={`Pinned · ${s.tag}`}
						icon={s.icon}
						title={p.title}
						body={p.body}
						{...(p.newTab ? { onAction: () => window.open(p.href, '_blank', 'noopener') } : { href: p.href })}
						pin={{ label: `Unpin ${p.title} from Home`, onUnpin: () => void onUnpin(p) }}
					/>
				);
			})}
		</>
	);
}

/** Keys of the items pinned on Home, so the feed never shows one twice. */
export function usePinnedKeys(): Set<string> {
	const { pins } = usePins();
	return new Set(pins.map((p) => p.key));
}
