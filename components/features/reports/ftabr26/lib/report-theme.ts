// @ts-nocheck
/* eslint-disable */
/* ─── Shared STX Brand Palette & Theme (extracted from report-gster26.tsx) ── */

export const BRAND = {
  pink:      "#ED1A5E",
  darkTitle: "#2D3B49",
  peach:     "#FDE1D9",
  slate:     "#4D5E72",
  lightBlue: "#BED0E3",
  teal:      "#76ADA7",
  tealBright:"#6A9DA9",
  navy:      "#2B3D8F",
  white:     "#FFFFFF",
  black:     "#000000",
  // Pitch green — the football accent (FTABR26)
  green:      "#387553",
  greenLight: "#5AA87C",
  // Audience colours
  athletes:  "#4F2484",
  athletesSec: "#9079AD",
  execs:     "#1FCC96",
  execsSec:  "#7ACBBD",
  fans:      "#0482FF",
  fansSec:   "#8FD0E8",
  // Business model colours
  b2b:       "#B1597E",
  b2c:       "#702C41",
};

export type Theme = {
  bg: string; bgSec: string; bgCard: string; bgCardHover: string;
  text: string; textSec: string; textMuted: string;
  border: string; titleColor: string; navBg: string;
  divider: string; tableRowAlt: string;
};

export const DARK: Theme = {
  bg:           "#0c0f1a",
  bgSec:        "#111827",
  bgCard:       "#1a2232",
  bgCardHover:  "#212d44",
  text:         BRAND.white,
  textSec:      BRAND.lightBlue,
  textMuted:    "#8899aa",
  border:       "rgba(190,208,227,0.1)",
  titleColor:   BRAND.white,
  navBg:        "rgba(12,15,26,0.9)",
  divider:      "rgba(237,26,94,0.25)",
  tableRowAlt:  "rgba(255,255,255,0.02)",
};

export const LIGHT: Theme = {
  bg:           BRAND.white,
  bgSec:        "#F4F6F9",
  bgCard:       BRAND.white,
  bgCardHover:  BRAND.peach,
  text:         BRAND.black,
  textSec:      BRAND.darkTitle,
  textMuted:    BRAND.slate,
  border:       "rgba(45,59,73,0.12)",
  titleColor:   BRAND.darkTitle,
  navBg:        "rgba(255,255,255,0.95)",
  divider:      "rgba(237,26,94,0.2)",
  tableRowAlt:  "#F9FAFB",
};
