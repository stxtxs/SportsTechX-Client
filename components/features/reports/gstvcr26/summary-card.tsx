"use client";

/**
 * GSTVCR26 · one Summary (hero) card. Same look and size as the original
 * cards (figure + one line, icon top right); clicking it jumps to its section.
 * `compact` is the mobile row layout.
 */
import React from "react";
import { BRAND } from "./brand";
import type { SummaryCard } from "./summary-cards";

type CardTheme = { bgCard: string; border: string; titleColor: string };

export function SummaryCardView({ card, icon, t, isDark, compact, isPdf, onOpen }: {
  card: SummaryCard;
  icon: React.ReactNode;
  t: CardTheme;
  isDark: boolean;
  compact: boolean;
  isPdf: boolean;
  onOpen: (target: string) => void;
}) {
  const ink = isDark ? t.titleColor : BRAND.darkTitle;
  const open = () => { if (!isPdf) onOpen(card.target); };
  const frame: React.CSSProperties = {
    background: isDark ? t.bgCard : "#fff",
    border: isDark ? `1px solid ${t.border}` : "none",
    position: "relative", overflow: "hidden",
    boxShadow: isDark ? "0 4px 24px rgba(0,0,0,0.4)" : "0 4px 24px rgba(0,0,0,0.2)",
    cursor: isPdf ? "default" : "pointer",
  };
  const a11y = isPdf ? {} : {
    role: "link" as const, tabIndex: 0, "aria-label": `${card.num} ${card.label}`,
    onClick: open, onKeyDown: (e: React.KeyboardEvent) => { if (e.key === "Enter") open(); },
  };

  if (compact) {
    return (
      <div {...a11y} style={{ ...frame, padding: "20px 18px", borderRadius: 10, display: "flex", alignItems: "center", gap: 14, flex: 1, minHeight: 0 }}>
        <div style={{ position: "absolute", top: 10, right: 10, opacity: 0.55 }}>{icon}</div>
        <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 24, color: BRAND.pink, lineHeight: 1, flexShrink: 0, minWidth: 55 }}>{card.num}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: ink, lineHeight: 1.4 }}>{card.label}</div>
        </div>
      </div>
    );
  }
  return (
    <div {...a11y} style={{ ...frame, padding: "26px 24px 22px", borderRadius: 12 }}>
      <div style={{ position: "absolute", top: 16, right: 16, opacity: 0.55 }}>{icon}</div>
      <div style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: "clamp(36px,3.5vw,50px)", color: BRAND.pink, lineHeight: 1 }}>{card.num}</div>
      <div style={{ marginTop: 10, fontSize: 13, fontWeight: 500, color: ink, lineHeight: 1.4 }}>{card.label}</div>
    </div>
  );
}
