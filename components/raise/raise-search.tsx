/** Raise's agent composer is the shared Atlas AgentComposer; these are Raise's suggestions. */
export { AgentComposer as RaiseSearch } from '@/components/atlas';
import { ASK_SUGGESTIONS } from '@/lib/atlas-copy';

/**
 * The Ask Atlas suggestions, the same three on Home, the chat page and the
 * docked panel (handover v1 §5; fix list 17 Nov, 1.3). One source: lib/atlas-copy.
 */
export const RAISE_SUGGESTIONS = ASK_SUGGESTIONS.raise;
export const EXPLORE_SUGGESTIONS = ASK_SUGGESTIONS.explore;
export const SCOUT_SUGGESTIONS = ASK_SUGGESTIONS.scout;
