'use client';

import { DealFlowSoon } from '@/components/scout/deal-flow-soon';

/** Deal Flow → one opportunity — "Coming soon" while Deal Flow is held back (see DealFlowSoon). */
export default function Page() {
	return <DealFlowSoon header={false} />;
}
