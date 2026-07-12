import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ORDER_BOOK_ANIMATION_DURATION_MS,
  ORDER_BOOK_DEPTH_BAR_RADIUS,
  ORDER_BOOK_DEPTH_BAR_VERTICAL_INSET,
  ORDER_BOOK_LEVEL_GROUP_GAP,
  isBoundedDepthTransitionDuration,
  resolveOrderBookDepthAnchor,
  resolveOrderBookDepthBarStyle,
  resolveOrderBookLevelGroupStyle
} from "./orderBookPresentation";
import { clampDepthTargetPercent } from "./marketMotionPresentation";

describe("orderBookPresentation", () => {
  it("anchors bids to the right edge", () => {
    expect(resolveOrderBookDepthAnchor("bid")).toBe("right");
  });

  it("anchors asks to the left edge", () => {
    expect(resolveOrderBookDepthAnchor("ask")).toBe("left");
  });

  it("keeps depth width clamped between 0 and 100", () => {
    expect(clampDepthTargetPercent(-4)).toBe(0);
    expect(clampDepthTargetPercent(140)).toBe(100);
    expect(clampDepthTargetPercent(42)).toBe(42);
  });

  it("uses zero level-group gap for continuous histogram rows", () => {
    expect(ORDER_BOOK_LEVEL_GROUP_GAP).toBe(0);
    expect(resolveOrderBookLevelGroupStyle().gap).toBe(0);
  });

  it("uses zero vertical inset for continuous histogram bars", () => {
    expect(ORDER_BOOK_DEPTH_BAR_VERTICAL_INSET).toBe(0);
    expect(resolveOrderBookDepthBarStyle("bid").top).toBe(0);
    expect(resolveOrderBookDepthBarStyle("ask").bottom).toBe(0);
  });

  it("uses zero bar radius for rectangular Figma bars", () => {
    expect(ORDER_BOOK_DEPTH_BAR_RADIUS).toBe(0);
    expect(resolveOrderBookDepthBarStyle("bid").borderRadius).toBe(0);
  });

  it("keeps animation duration bounded near the stream cadence", () => {
    expect(isBoundedDepthTransitionDuration(ORDER_BOOK_ANIMATION_DURATION_MS)).toBe(
      true
    );
  });

  it("uses separate bid and ask zero-gap level groups instead of a global row gap", () => {
    const source = readFileSync(resolve(__dirname, "OrderBookTable.tsx"), "utf8");

    expect(source).toMatch(/styles\.bidSection/);
    expect(source).toMatch(/styles\.askSection/);
    expect(source).toMatch(/styles\.levelGroup/);
    expect(source).not.toMatch(/container:\s*\{[^}]*gap:\s*2/s);
    expect(source).toMatch(/resolveOrderBookLevelGroupStyle/);
  });
});
