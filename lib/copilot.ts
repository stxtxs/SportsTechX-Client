'use client';

import { useSyncExternalStore } from 'react';

/**
 * Whether the Ask Atlas co-pilot panel is open. A tiny shared store so the top
 * bar button, the ⌘J shortcut and the panel itself stay in step without
 * threading props through the shell. In memory only: the panel, and its
 * conversation, live for the whole app session, across page changes.
 */
let open = false;
const listeners = new Set<() => void>();

function emit() {
	listeners.forEach((l) => l());
}

export function setCopilotOpen(next: boolean) {
	if (open === next) return;
	open = next;
	emit();
}

export const toggleCopilot = () => setCopilotOpen(!open);

function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => listeners.delete(listener);
}

export function useCopilotOpen(): boolean {
	return useSyncExternalStore(subscribe, () => open, () => false);
}
