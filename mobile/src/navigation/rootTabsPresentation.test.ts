import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { colors } from "../theme";
import { resolveTabIconTint } from "./rootTabsPresentation";

describe("rootTabsPresentation", () => {
  it("resolves focused tint to buy green", () => {
    expect(resolveTabIconTint(true)).toBe(colors.buy);
  });

  it("resolves inactive tint to muted gray", () => {
    expect(resolveTabIconTint(false)).toBe(colors.textMuted);
  });

  it("keeps active and inactive tints distinct", () => {
    expect(resolveTabIconTint(true)).not.toBe(resolveTabIconTint(false));
  });

  it("uses the common resolver for all four tabs", () => {
    const source = readFileSync(resolve(__dirname, "RootTabs.tsx"), "utf8");

    expect(source).toMatch(/resolveTabIconTint\(focused\)/);
    expect((source.match(/resolveTabIconTint\(focused\)/g) ?? []).length).toBe(1);
    expect(source).toMatch(/tabIcons\.Terminal/);
    expect(source).toMatch(/tabIcons\.Markets/);
    expect(source).toMatch(/tabIcons\.Telemetry/);
    expect(source).toMatch(/tabIcons\.Settings/);
    expect(resolveTabIconTint(true)).toBe(colors.buy);
    expect(resolveTabIconTint(false)).toBe(colors.textMuted);
  });
});
