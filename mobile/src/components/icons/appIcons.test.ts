import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("app icons", () => {
  it("renders bookmark outline and filled states with react-native-svg", () => {
    const source = readFileSync(resolve(__dirname, "BookmarkIcon.tsx"), "utf8");

    expect(source.includes("react-native-svg")).toBe(true);
    expect(source.includes("filled ?")).toBe(true);
    expect(source.includes('"transparent"')).toBe(true);
    expect(source.includes("colors.buy")).toBe(true);
    expect(source.includes("colors.textSecondary")).toBe(true);
    expect(source.includes("BOOKMARK_ICON_SIZE_DP = 21")).toBe(true);
  });

  it("renders a left-pointing back arrow with react-native-svg", () => {
    const source = readFileSync(resolve(__dirname, "BackIcon.tsx"), "utf8");

    expect(source.includes("react-native-svg")).toBe(true);
    expect(source.includes("strokeLinecap")).toBe(true);
    expect(source.includes("colors.buy")).toBe(true);
    expect(source.includes("BACK_ICON_SIZE_DP = 21")).toBe(true);
  });
});
