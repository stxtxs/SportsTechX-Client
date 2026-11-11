'use client';

import { useEffect, useRef } from 'react';
import { Sparkles, Send, Square } from 'lucide-react';

import type { ReactNode } from 'react';

/**
 * AgentComposer — the Atlas agent chat bar (Figma Home composer): a growing
 * textarea with a send/stop pill and optional suggestion chips. Controlled;
 * behaviour comes from props. Used by the Raise home + chat page and Scout home.
 */
export function AgentComposer({
	value,
	onChange,
	onSubmit,
	placeholder = 'Ask Atlas about investors, your market, your raise…',
	disabled = false,
	autoFocus = false,
	streaming = false,
	onStop,
	suggestions,
	onSuggestion,
	badge,
	placeholderLead,
	compact = false,
}: {
	value: string;
	onChange: (v: string) => void;
	onSubmit: () => void;
	placeholder?: string;
	/**
	 * Highlighted words before the placeholder ("**Ask Atlas** about …"). A
	 * native placeholder can't style part of itself, so with a lead the
	 * placeholder is drawn as an overlay and the textarea is labelled instead.
	 */
	placeholderLead?: string;
	/** A shorter empty box (one line plus room), e.g. on Home. */
	compact?: boolean;
	disabled?: boolean;
	autoFocus?: boolean;
	streaming?: boolean;
	onStop?: () => void;
	suggestions?: string[];
	onSuggestion?: (s: string) => void;
	/** Shown at the left of the action row (e.g. a status pill). */
	badge?: ReactNode;
}) {
	const taRef = useRef<HTMLTextAreaElement>(null);

	const grow = (el: HTMLTextAreaElement) => {
		el.style.height = 'auto';
		el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
	};

	// Re-fit height when the value changes externally (suggestion click, reset).
	useEffect(() => { if (taRef.current) grow(taRef.current); }, [value]);

	const submit = () => { if (value.trim() && !disabled) onSubmit(); };

	return (
		<div className={`atlas-composer${compact ? ' atlas-composer--compact' : ''}`}>
			<div className="atlas-composer-box">
				<div className="atlas-composer-row">
					<Sparkles size={19} strokeWidth={1.25} className="atlas-composer-glyph" aria-hidden="true" />
					<div className="atlas-composer-field">
						<textarea
							ref={taRef}
							className="atlas-composer-input"
							placeholder={placeholderLead ? undefined : placeholder}
							aria-label={placeholderLead ? `${placeholderLead} ${placeholder}` : undefined}
							value={value}
							rows={1}
							autoFocus={autoFocus}
							onChange={(e) => { onChange(e.target.value); grow(e.target); }}
							onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
						/>
						{placeholderLead && !value && (
							<span className="atlas-composer-ph" aria-hidden="true">
								<b>{placeholderLead}</b> {placeholder}
							</span>
						)}
					</div>
				</div>
				<div className="atlas-composer-actions">
					{badge && <span className="atlas-composer-badge">{badge}</span>}
					{streaming && onStop ? (
						<button className="atlas-composer-send" aria-label="Stop" onClick={onStop}>
							<Square size={12} />
						</button>
					) : (
						<button className="atlas-composer-send" aria-label="Send" disabled={disabled || !value.trim()} onClick={submit}>
							<Send size={13} />
						</button>
					)}
				</div>
			</div>
			{suggestions && suggestions.length > 0 && (
				<div className="atlas-composer-suggest">
					<span className="atlas-composer-suggest-label">Suggestions:</span>
					{suggestions.map((s) => (
						<button key={s} type="button" className="atlas-composer-chip" onClick={() => { (onSuggestion ?? onChange)(s); taRef.current?.focus(); }}>{s}</button>
					))}
				</div>
			)}
		</div>
	);
}
