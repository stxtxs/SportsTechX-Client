'use client';

import { DealFlowSoon } from '@/components/scout/deal-flow-soon';

/** From the Circle → Share a deal — "Coming soon" while Deal Flow is held back (see DealFlowSoon). */
export default function Page() {
	return <DealFlowSoon header={false} />;
}
