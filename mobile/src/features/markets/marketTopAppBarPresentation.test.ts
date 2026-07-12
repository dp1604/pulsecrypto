import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  deriveTopAppBarConnectionPresentation,
  MARKET_TOP_APP_BAR_BACK_HEIGHT_DP,
  MARKET_TOP_APP_BAR_BACK_WIDTH_DP,
  MARKET_TOP_APP_BAR_HEIGHT_DP,
  MARKET_TOP_APP_BAR_HORIZONTAL_PADDING_DP,
  resolveTopAppBarToneColor
} from "./marketTopAppBarPresentation";

describe("marketTopAppBarPresentation", () => {
  it("maps live status to CONNECTED", () => {
    const presentation = deriveTopAppBarConnectionPresentation("live");
    expect(presentation.statusLabel).toBe("CONNECTED");
    expect(presentation.tone).toBe("connected");
  });

  it("maps reconnecting status to RECONNECTING with warning tone", () => {
    const presentation = deriveTopAppBarConnectionPresentation("reconnecting", 3);
    expect(presentation.statusLabel).toBe("RECONNECTING");
    expect(presentation.tone).toBe("warning");
    expect(presentation.accessibilityLabel).toContain("attempt 3");
  });

  it("maps paused and disconnected states truthfully", () => {
    expect(deriveTopAppBarConnectionPresentation("paused").statusLabel).toBe(
      "PAUSED"
    );
    expect(
      deriveTopAppBarConnectionPresentation("disconnected").statusLabel
    ).toBe("DISCONNECTED");
  });

  it("uses the Figma top app bar dimensions", () => {
    expect(MARKET_TOP_APP_BAR_HEIGHT_DP).toBe(56);
    expect(MARKET_TOP_APP_BAR_HORIZONTAL_PADDING_DP).toBe(16);
    expect(MARKET_TOP_APP_BAR_BACK_WIDTH_DP).toBeGreaterThanOrEqual(20);
    expect(MARKET_TOP_APP_BAR_BACK_WIDTH_DP).toBeLessThanOrEqual(22);
    expect(MARKET_TOP_APP_BAR_BACK_HEIGHT_DP).toBe(
      MARKET_TOP_APP_BAR_BACK_WIDTH_DP
    );
  });

  it("resolves tone colors from the palette", () => {
    const palette = {
      buy: "#00C57A",
      warning: "#FFB86B",
      textMuted: "#6F7A8A",
      sell: "#FF3B69"
    };

    expect(resolveTopAppBarToneColor("connected", palette)).toBe(palette.buy);
    expect(resolveTopAppBarToneColor("warning", palette)).toBe(palette.warning);
    expect(resolveTopAppBarToneColor("error", palette)).toBe(palette.sell);
    expect(resolveTopAppBarToneColor("muted", palette)).toBe(palette.textMuted);
  });
});

describe("MarketTopAppBar back navigation", () => {
  it("uses BackIcon instead of the menu asset", () => {
    const source = readFileSync(
      resolve(__dirname, "MarketTopAppBar.tsx"),
      "utf8"
    );

    expect(source.includes("menu.png")).toBe(false);
    expect(source.includes("onMenuPress")).toBe(false);
    expect(source.includes("BackIcon")).toBe(true);
    expect(source.includes("onBackPress")).toBe(true);
    expect(source.includes("backButton")).toBe(true);
    expect(source.includes("Back to Markets")).toBe(true);
    expect(source.includes("minWidth: 44")).toBe(true);
    expect(source.includes("minHeight: 44")).toBe(true);
  });

  it("keeps MarketDetailsScreen wired to goBack", () => {
    const source = readFileSync(
      resolve(__dirname, "../../screens/MarketDetailsScreen.tsx"),
      "utf8"
    );

    expect(source.includes("onBackPress={() => navigation.goBack()}")).toBe(true);
    expect(source.includes("onMenuPress")).toBe(false);
  });
});
