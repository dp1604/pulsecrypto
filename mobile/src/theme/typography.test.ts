import { describe, expect, it } from "vitest";
import {
  NUMERIC_TYPOGRAPHY_ROLES,
  TYPOGRAPHY_MONO_FAMILY,
  TYPOGRAPHY_ROLES,
  TYPOGRAPHY_SANS_FAMILY,
  getTypographyStyle,
  isNumericTypographyRole,
  typography
} from "./typography";

describe("typography", () => {
  it("defines every required role", () => {
    const required = [
      "displayPrice",
      "appBarPair",
      "connectionStatus",
      "screenTitle",
      "sectionEyebrow",
      "body",
      "bodySecondary",
      "searchInput",
      "marketPair",
      "marketSymbol",
      "marketPrice",
      "marketChange",
      "metricLabel",
      "metricValue",
      "tableHeader",
      "tablePrice",
      "tableAmount",
      "tableTotal",
      "depthLegend",
      "depthCardLabel",
      "depthCardValue",
      "tabLabel",
      "placeholderTitle",
      "placeholderBody",
      "buttonLabel"
    ];

    expect(TYPOGRAPHY_ROLES).toEqual(expect.arrayContaining(required));
    expect(TYPOGRAPHY_ROLES.length).toBe(required.length);
  });

  it("uses monospace roles for numeric data", () => {
    for (const role of NUMERIC_TYPOGRAPHY_ROLES) {
      expect(isNumericTypographyRole(role)).toBe(true);
      expect(getTypographyStyle(role).fontFamily).toBe(TYPOGRAPHY_MONO_FAMILY);
      expect(getTypographyStyle(role).fontVariant).toContain("tabular-nums");
    }
  });

  it("uses sans-serif for interface roles", () => {
    expect(typography.appBarPair.fontFamily).toBe(TYPOGRAPHY_SANS_FAMILY);
    expect(typography.screenTitle.fontFamily).toBe(TYPOGRAPHY_SANS_FAMILY);
    expect(typography.tabLabel.fontFamily).toBe(TYPOGRAPHY_SANS_FAMILY);
  });

  it("defines uppercase and letter spacing for eyebrow roles", () => {
    expect(typography.sectionEyebrow.textTransform).toBe("uppercase");
    expect(typography.sectionEyebrow.letterSpacing).toBeGreaterThan(0);
    expect(typography.connectionStatus.textTransform).toBe("uppercase");
    expect(typography.metricLabel.textTransform).toBe("uppercase");
    expect(typography.tableHeader.textTransform).toBe("uppercase");
    expect(typography.depthCardLabel.textTransform).toBe("uppercase");
  });

  it("keeps sizes within measured Figma ranges", () => {
    expect(typography.appBarPair.fontSize).toBeGreaterThanOrEqual(17);
    expect(typography.appBarPair.fontSize).toBeLessThanOrEqual(18);
    expect(typography.displayPrice.fontSize).toBeGreaterThanOrEqual(32);
    expect(typography.displayPrice.fontSize).toBeLessThanOrEqual(36);
    expect(typography.marketChange.fontSize).toBeGreaterThanOrEqual(13);
    expect(typography.marketChange.fontSize).toBeLessThanOrEqual(15);
    expect(typography.tabLabel.fontSize).toBeGreaterThanOrEqual(10);
    expect(typography.tabLabel.fontSize).toBeLessThanOrEqual(11);
  });

  it("avoids zero or invalid line heights", () => {
    for (const role of TYPOGRAPHY_ROLES) {
      const style = getTypographyStyle(role);
      expect(style.lineHeight).toBeGreaterThan(0);
      expect(style.fontSize).toBeGreaterThan(0);
    }
  });

  it("keeps app-bar and table roles single-line compatible", () => {
    expect(typography.appBarPair.lineHeight).toBeLessThanOrEqual(
      (typography.appBarPair.fontSize ?? 0) + 4
    );
    expect(typography.tableHeader.lineHeight).toBeLessThanOrEqual(14);
    expect(typography.tablePrice.lineHeight).toBeLessThanOrEqual(18);
  });
});
