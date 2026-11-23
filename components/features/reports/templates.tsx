'use client';

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

/**
 * Custom report page templates, chosen by `reports.template` — never by slug. Each one is
 * layout only: every word, number, image and chart value comes from the report's document
 * (reports.content) and frozen data (report_datasets), so a new edition can reuse a template
 * with its own content. Client-only (canvas, gsap / ScrollTrigger, smooth scroll).
 */
export type TemplateProps = { slug: string; content?: Record<string, unknown> | null; preview?: boolean };

const bg = (color: string) => function TemplateLoading() { return <div style={{ minHeight: '100vh', background: color }} />; };

export const REPORT_TEMPLATES: Record<string, { Component: ComponentType<TemplateProps>; background: string }> = {
	gster26: {
		Component: dynamic(() => import('./gster26/report-gster26'), { ssr: false, loading: bg('#0c0f1a') }) as ComponentType<TemplateProps>,
		background: '#0c0f1a',
	},
	ftabr26: {
		Component: dynamic(() => import('./ftabr26/report-ftabr26'), { ssr: false, loading: bg('#2d3b49') }) as ComponentType<TemplateProps>,
		background: '#2d3b49',
	},
	benchmark26: {
		Component: dynamic(() => import('./benchmark26/report-benchmark26'), { ssr: false, loading: bg('#2d3b49') }) as ComponentType<TemplateProps>,
		background: '#2d3b49',
	},
	methodology: {
		Component: dynamic(() => import('./methodology/report-methodology'), { ssr: false, loading: bg('#2d3b49') }) as ComponentType<TemplateProps>,
		background: '#2d3b49',
	},
};
