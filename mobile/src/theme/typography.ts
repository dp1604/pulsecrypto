import type { TypographyStyle } from "./typographyTypes";

/** Platform sans-serif fallback when exact Figma families are unavailable. */
export const TYPOGRAPHY_SANS_FAMILY = "sans-serif";

/** Platform monospace fallback for tabular market values. */
export const TYPOGRAPHY_MONO_FAMILY = "monospace";

const tabularNums: TypographyStyle["fontVariant"] = ["tabular-nums"];

const uppercaseEyebrow = {
  textTransform: "uppercase" as const,
  letterSpacing: 0.6
};

export const typography = {
  displayPrice: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 34,
    fontWeight: "700" as const,
    lineHeight: 38,
    fontVariant: tabularNums
  },
  appBarPair: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 17,
    fontWeight: "700" as const,
    lineHeight: 20
  },
  connectionStatus: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 12,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const
  },
  screenTitle: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 24,
    fontWeight: "700" as const,
    lineHeight: 28
  },
  sectionEyebrow: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 12,
    colorRole: "muted" as const,
    ...uppercaseEyebrow
  },
  body: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18
  },
  bodySecondary: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 18,
    colorRole: "secondary" as const
  },
  searchInput: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 16,
    fontWeight: "400" as const,
    lineHeight: 22
  },
  marketPair: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 22
  },
  marketSymbol: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 16,
    colorRole: "muted" as const
  },
  marketPrice: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
    fontVariant: tabularNums
  },
  marketChange: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 18,
    fontVariant: tabularNums
  },
  metricLabel: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 12,
    colorRole: "muted" as const,
    ...uppercaseEyebrow
  },
  metricValue: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 14,
    fontWeight: "400" as const,
    lineHeight: 18,
    fontVariant: tabularNums
  },
  tableHeader: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 12,
    colorRole: "muted" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const
  },
  tablePrice: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 16,
    fontVariant: tabularNums
  },
  tableAmount: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 16,
    fontVariant: tabularNums
  },
  tableTotal: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 13,
    fontWeight: "400" as const,
    lineHeight: 16,
    fontVariant: tabularNums
  },
  depthLegend: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 11,
    fontWeight: "400" as const,
    lineHeight: 14
  },
  depthCardLabel: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 10,
    fontWeight: "700" as const,
    lineHeight: 12,
    colorRole: "muted" as const,
    letterSpacing: 0.5,
    textTransform: "uppercase" as const
  },
  depthCardValue: {
    fontFamily: TYPOGRAPHY_MONO_FAMILY,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 16,
    fontVariant: tabularNums
  },
  tabLabel: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 10,
    fontWeight: "600" as const,
    lineHeight: 12
  },
  placeholderTitle: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 18,
    fontWeight: "600" as const,
    lineHeight: 22
  },
  placeholderBody: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 15,
    fontWeight: "400" as const,
    lineHeight: 22,
    colorRole: "secondary" as const
  },
  buttonLabel: {
    fontFamily: TYPOGRAPHY_SANS_FAMILY,
    fontSize: 14,
    fontWeight: "600" as const,
    lineHeight: 18
  }
} as const;

export type TypographyRole = keyof typeof typography;

export const TYPOGRAPHY_ROLES: readonly TypographyRole[] = Object.keys(
  typography
) as TypographyRole[];

export const NUMERIC_TYPOGRAPHY_ROLES: readonly TypographyRole[] = [
  "displayPrice",
  "marketPrice",
  "marketChange",
  "metricValue",
  "tablePrice",
  "tableAmount",
  "tableTotal",
  "depthCardValue"
];

export const isNumericTypographyRole = (role: TypographyRole): boolean =>
  NUMERIC_TYPOGRAPHY_ROLES.includes(role);

export const getTypographyStyle = (role: TypographyRole): TypographyStyle =>
  typography[role];
