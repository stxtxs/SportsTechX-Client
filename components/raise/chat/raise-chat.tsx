'use client';

import { useCallback, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowUp, ArrowUpRight, X, Download, Plus, History, Maximize2 } from 'lucide-react';
import { useChat, AI_MD_CSS } from '@/components/chat/chat-core';
import { AtlasMark } from '@/components/atlas/brand/atlas-logo';
import {
	chatCopy, founderPageContext, founderActionFromTool, founderRewritePath, scoutRewritePath,
	FounderMessages,
} from './founder-chat';
import { RAISE_SUGGESTIONS, SCOUT_SUGGESTIONS, EXPLORE_SUGGESTIONS } from '@/components/raise/raise-search';
import { useNav } from '@/hooks/use-nav';
import { setCopilotOpen, toggleCopilot, useCopilotOpen } from '@/lib/copilot';
import { hrefOf } from '@/lib/routes';
import { deslug } from '@/components/shell/breadcrumbs';
import './raise-chat.css';

/**
 * Ask Atlas — the streaming agent as a co-pilot docked on the right. Opened from
 * the top bar's Ask Atlas button or ⌘J / Ctrl+J; open state lives in
 * lib/copilot. It sits beside the page rather than over it: no backdrop, the
 * page narrows to make room (html.copilot-open, ≥1024px), and it stays mounted
 * across page changes so the conversation carries on while you browse. Route
 * policy + transcript render are shared with the chat page via founder-chat.tsx.
 *
 * Mounted for every product (see app-shell): the component is identical, only
 * the copy, the suggested prompts and the route policy differ, and all three
 * follow the viewer's tier.
 *
 * There is no Figma frame for this panel, so it borrows the parts of the
 * system that already have one: the sidebar's textured rail for its header,
 * the Atlas mark for its identity (a generic sparkle said "some AI", not
 * "Atlas"), mono uppercase labels, and the command palette's row for prompts.
 */

export function RaiseChat() {
	const open = useCopilotOpen();
	const pathname = usePathname();
	const router = useRouter();
	const { tier } = useNav();
	const isScout = tier === 'scout';
	const copy = chatCopy(tier);
	// Lead with the page you're on: a company profile offers "Tell me about
	// <Company>" (the name in the prompt, so it needs no entity support).
	const pageSuggestion = pageSuggestionFor(pathname);
	const suggestions = [
		...(pageSuggestion ? [pageSuggestion] : []),
		...(isScout ? SCOUT_SUGGESTIONS : tier === 'raise' ? RAISE_SUGGESTIONS : EXPLORE_SUGGESTIONS),
	].slice(0, 5);
	const inputRef = useRef<HTMLTextAreaElement>(null);

	// Memoized: `useChat` keeps this in its callback deps, so a fresh closure on
	// every render would rebuild them for nothing.
	const actionFromTool = useCallback(
		(tool: string, input: unknown) => founderActionFromTool(tool, input, tier),
		[tier],
	);

	const chat = useChat({
		greeting: copy.greeting,
		actionFromTool,
		pageContext: () => founderPageContext(pathname),
		insufficientCreditsMd: copy.insufficient,
	});

	const {
		messages, input, setInput, streaming, stage, conversationId, loading,
		showHistory, conversations, historyLoading, bodyRef,
		send, resetConversation, toggleHistory, loadConversation, exportConversation,
	} = chat;

	// Closing hides the panel; a reply still being written carries on and is
	// there when it's reopened.
	const close = () => setCopilotOpen(false);
	// Move the current thread to the full chat page. The page renders the same
	// shared session, so the thread is there at once and a reply that is still
	// streaming carries on — nothing to abort or refetch.
	const expand = () => {
		setCopilotOpen(false);
		router.push(conversationId ? `/chat/${conversationId}` : '/chat');
	};
	// A fresh conversation is just the greeting. That state gets the intro and
	// the suggested prompts instead of one lonely paragraph at the top of an
	// otherwise empty panel.
	const fresh = messages.length <= 1 && !streaming && !loading;

	// The composer grows with what is typed, then shrinks back once a message
	// is sent and the field empties.
	useEffect(() => {
		if (!input && inputRef.current) inputRef.current.style.height = '';
	}, [input]);
	useEffect(() => {
		if (open) inputRef.current?.focus();
	}, [open]);

	// Dock: the page narrows to make room (CSS on html.copilot-open).
	useEffect(() => {
		document.documentElement.classList.toggle('copilot-open', open);
		return () => document.documentElement.classList.remove('copilot-open');
	}, [open]);

	// ⌘J / Ctrl+J toggles from anywhere; Esc closes while focus is in the panel.
	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') { e.preventDefault(); toggleCopilot(); }
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, []);

	return (
		<>
			<style>{AI_MD_CSS}</style>

			{/* Panel stays mounted (for the slide animation + to keep the thread on
			    close); `inert` when closed removes its off-screen controls from tab
			    order and the a11y tree. */}
			<aside
				id="atlas-copilot"
				className={`raise-chat-panel ${open ? 'open' : ''}`}
				inert={!open ? true : undefined}
				aria-label="Ask Atlas"
				onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } }}
			>
				<header className="raise-chat-head">
					<div className="raise-chat-mark"><AtlasMark size={17} /></div>
					<div className="raise-chat-titles">
						<h3>Ask Atlas</h3>
						<div className="raise-chat-status">
							<span className={`raise-chat-dot ${streaming ? 'busy' : ''}`} />
							{streaming ? `${stage || 'Thinking'}…` : 'Online'}
						</div>
					</div>
					<div className="raise-chat-tools">
						{(conversationId || messages.length > 1) && (
							<button className="raise-chat-iconbtn" onClick={resetConversation} aria-label="New conversation" title="New chat">
								<Plus size={15} strokeWidth={1.5} />
							</button>
						)}
						{conversationId && (
							<button className="raise-chat-iconbtn" onClick={() => void exportConversation()} aria-label="Export conversation" title="Export">
								<Download size={14} strokeWidth={1.5} />
							</button>
						)}
						<button className="raise-chat-iconbtn" onClick={() => void toggleHistory()} aria-label="Conversation history" title="History" data-active={showHistory}>
							<History size={14} strokeWidth={1.5} />
						</button>
						<button className="raise-chat-iconbtn" onClick={expand} aria-label="Open full chat page" title="Expand">
							<Maximize2 size={14} strokeWidth={1.5} />
						</button>
						<button className="raise-chat-iconbtn" onClick={close} aria-label="Close Ask Atlas" title="Close (Esc)">
							<X size={16} strokeWidth={1.5} />
						</button>
					</div>
				</header>

				{showHistory && (
					<div className="ai-history">
						<div className="ai-history-head">Past conversations</div>
						{historyLoading ? (
							<div className="ai-history-empty">Loading…</div>
						) : (conversations?.length ?? 0) === 0 ? (
							<div className="ai-history-empty">No past conversations yet.</div>
						) : (
							conversations!.map((c) => (
								<button key={c.id} className="ai-history-item" onClick={() => void loadConversation(c.id)} title={c.title ?? 'Untitled conversation'}>
									<span className="ai-history-title">{c.title || 'Untitled conversation'}</span>
									<span className="ai-history-date">{new Date(c.last_message_at).toLocaleDateString()}</span>
								</button>
							))
						)}
					</div>
				)}

				<div className="raise-chat-body" ref={bodyRef}>
					{loading ? (
						<div className="raise-chatpage-loading" role="status">Loading conversation…</div>
					) : fresh ? (
						<div className="raise-chat-intro">
							<div className="raise-chat-intro__eyebrow">Ask Atlas</div>
							<h2 className="raise-chat-intro__title">What can I help with?</h2>
							<p className="raise-chat-intro__lede">{copy.greeting}</p>

							<div className="raise-chat-intro__label">Try asking</div>
							<div className="raise-chat-prompts">
								{suggestions.map((s) => (
									<button key={s} type="button" className="raise-chat-prompt" onClick={() => void send(s)}>
										<span>{s}</span>
										<ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
									</button>
								))}
							</div>
						</div>
					) : (
						<FounderMessages
							messages={messages} streaming={streaming} stage={stage}
							onAction={(href) => router.push(href)}
							rewritePath={isScout ? scoutRewritePath : founderRewritePath}
						/>
					)}
				</div>

				<footer className="raise-chat-foot">
					<div className="raise-chat-input-row">
						<textarea
							ref={inputRef}
							className="raise-chat-input"
							placeholder={copy.placeholder}
							value={input}
							onChange={(e) => {
								setInput(e.target.value);
								e.target.style.height = 'auto';
								e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`;
							}}
							onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
							rows={1}
							disabled={streaming}
							aria-label="Message the co-pilot"
						/>
						<button className="raise-chat-send" onClick={() => void send()} disabled={streaming || !input.trim()} aria-label="Send">
							<ArrowUp size={15} strokeWidth={2} />
						</button>
					</div>
					<div className="raise-chat-hint">
						<span><kbd>↵</kbd> send</span>
						<span><kbd>⇧</kbd><kbd>↵</kbd> new line</span>
					</div>
				</footer>
			</aside>
		</>
	);
}

/** A prompt for the page in view, or null. Company profiles only, for now. */
function pageSuggestionFor(pathname: string | null): string | null {
	const base = `${hrefOf('companies')}/`;
	if (!pathname?.startsWith(base)) return null;
	const slug = decodeURIComponent(pathname.slice(base.length).split('/')[0] ?? '');
	return slug ? `Tell me about ${deslug(slug)}` : null;
}
