import { describe, expect, it } from "vitest";
import {
  deriveTopAppBarConnectionPresentation,
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
