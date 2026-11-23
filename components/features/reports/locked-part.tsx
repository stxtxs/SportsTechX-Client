"use client";

import Link from "next/link";
import { Lock } from "lucide-react";

/**
 * A page block the admin locked (reports.content.lockedParts), as an Explore reader sees it:
 * the block's heading, then "Unlocked with Raise or Scout" and See solutions. Drawn in the
 * report's own theme colours; `anchor` keeps the page's header links working.
 */
export function LockedPart({ anchor, title, colors }: {
  anchor?: string;
  title: string;
  colors: { bg: string; card: string; border: string; title: string; muted: string; accent: string };
}) {
  return (
    <section id={anchor} style={{ background: colors.bg, padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 clamp(16px, 4vw, 40px)" }}>
        <h2 style={{ margin: "0 0 18px", fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(28px,3vw,44px)", lineHeight: 0.95, color: colors.title }}>{title}</h2>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap", padding: "20px 24px", borderRadius: 14, border: `1px solid ${colors.border}`, background: colors.card }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 17, fontWeight: 600, color: colors.title }}>
            <Lock size={16} aria-hidden="true" /> Unlocked with Raise or Scout
          </span>
          <span style={{ flex: "1 1 220px", fontSize: 14, color: colors.muted }}>This part of the report is for Raise and Scout members.</span>
          <Link href="/solutions" style={{ display: "inline-block", padding: "10px 18px", borderRadius: 999, background: colors.accent, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", textDecoration: "none" }}>See solutions</Link>
        </div>
      </div>
    </section>
  );
}

/** Which blocks to draw locked: what the server says for this reader, or — in the admin's
 *  preview (draft `content`) — the draft's lockedParts when the admin views it as Explore. */
export function lockedNow(content: Record<string, unknown> | null | undefined, doc: { locked_parts?: unknown } | undefined): string[] {
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  if (content !== undefined) return content?.__asExplore ? list(content?.lockedParts) : [];
  return list(doc?.locked_parts);
}
