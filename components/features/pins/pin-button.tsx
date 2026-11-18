'use client';

import type { MouseEvent } from 'react';
import { toast } from 'sonner';
import { Pin } from 'lucide-react';
import { usePins } from './use-pins';
import type { PinTarget } from './rules';

/**
 * The pin icon beside a content card's "Open" (fix brief N1). Outline: not on
 * Home; filled: pinned to Home. A click pins or unpins. Icon only, no word —
 * the hover text says what it does.
 */
export function PinButton({ target, className }: { target: PinTarget; className?: string }) {
	const { isPinned, pin, unpin } = usePins();
	const on = isPinned(target.key);
	const label = on ? 'Unpin from Home' : 'Pin to Home';

	const onClick = async (e: MouseEvent) => {
		// Cards can sit inside a link (the Fundraising Guide): pin, don't open.
		e.preventDefault();
		e.stopPropagation();
		if (on) { if (await unpin(target.key)) toast('Removed from Home.'); }
		else if (await pin(target)) toast.success('Pinned to Home.');
	};

	return (
		<button
			type="button"
			className={`atlas-action atlas-pin-btn${on ? ' is-on' : ''}${className ? ` ${className}` : ''}`}
			aria-pressed={on}
			aria-label={`${label}: ${target.title}`}
			data-tip={label}
			onClick={(e) => void onClick(e)}
		>
			<span className="atlas-action__icon"><Pin fill={on ? 'currentColor' : 'none'} aria-hidden="true" /></span>
		</button>
	);
}
