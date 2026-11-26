import { mutate } from 'swr';
import { toast } from 'sonner';
import { apiRequest } from '@/lib/query-client';
import { refreshPaths } from '@/lib/invalidate';
import { qk } from '@/lib/query-keys';
import type { StageOption } from '@/components/features/watchlists/stage-pill';

/** Scout's watchlist stages, as the API names them, in board order. */
export const COMPANY_STAGES: StageOption[] = [
	{ key: 'identified', label: 'Identified', tone: 'neutral' },
	{ key: 'reviewing', label: 'Reviewing', tone: 'navy' },
	{ key: 'meeting', label: 'Meeting', tone: 'navy' },
	{ key: 'due_diligence', label: 'Due diligence', tone: 'warn' },
	{ key: 'passed', label: 'Passed', tone: 'danger' },
	{ key: 'invested', label: 'Invested', tone: 'ok' },
];
/** A company with no stage yet sits in Identified, as on the board. */
export const companyStage = (stage: string | null | undefined) => stage || 'identified';

/**
 * Move a company to another stage. Shared by the board (drag, "Move to…") and
 * List view (the Stage pill), so both save the same way. Optimistic; the
 * refetch after puts the truth back on a failure. Moving to or from Passed
 * changes Scout's recommendations too.
 */
export async function moveCompanyStage(listId: string, companyId: string, stage: string): Promise<void> {
	const key = qk.userWatchlists.companies(listId);
	void mutate(key, (d?: { data: Array<{ id: string; stage?: string | null }> }) =>
		d && { ...d, data: d.data.map((c) => (c.id === companyId ? { ...c, stage } : c)) }, { revalidate: false });
	try {
		const res = await apiRequest('PATCH', `/api/scout/watchlists/${listId}/companies/${companyId}/stage`, { stage });
		if (!res.ok) throw new Error(String(res.status));
	} catch {
		toast.error("Couldn't move that company. Please try again.");
	}
	void mutate(key);
	void refreshPaths('/api/scout/recommended');
}
