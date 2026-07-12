import { describe, expect, it } from "vitest";
import {
  formatChange24hPercent,
  formatConnectionStatusLabel,
  formatLivePrice
} from "./liveMarketFormatting";

describe("liveMarketFormatting", () => {
  it("formats a large BTC-like price", () => {
    expect(formatLivePrice(68432.17)).toBe("68,432.17");
  });

  it("formats a medium ETH/SOL-like price", () => {
    expect(formatLivePrice(2456.7891)).toBe("2,456.79");
  });

  it("formats a small DOGE/XRP-like price", () => {
    expect(formatLivePrice(0.123456)).toBe("0.123456");
  });

  it("formats zero neutrally", () => {
    expect(formatLivePrice(0)).toBe("0.00");
    expect(formatChange24hPercent(0)).toBe("0.00%");
  });

  it("formats positive change with plus sign", () => {
    expect(formatChange24hPercent(2.34)).toBe("+2.34%");
  });

  it("formats negative change with minus sign", () => {
    expect(formatChange24hPercent(-1.2)).toBe("-1.20%");
  });

  it("formats very small change", () => {
    expect(formatChange24hPercent(0.01)).toBe("+0.01%");
  });

  it("uses defensive fallback for non-finite values", () => {
    expect(formatLivePrice(Number.NaN)).toBe("—");
    expect(formatLivePrice(Number.POSITIVE_INFINITY)).toBe("—");
    expect(formatChange24hPercent(Number.NaN)).toBe("—");
  });

  it("formats connection status labels", () => {
    expect(formatConnectionStatusLabel("connecting")).toBe(
      "Connection: Connecting"
    );
    expect(formatConnectionStatusLabel("connected")).toBe(
      "Connection: Connected, waiting for data"
    );
    expect(formatConnectionStatusLabel("live")).toBe("Connection: Live");
    expect(formatConnectionStatusLabel("reconnecting")).toBe(
      "Connection: Reconnecting"
    );
    expect(formatConnectionStatusLabel("paused")).toBe("Connection: Paused");
    expect(formatConnectionStatusLabel("disconnected")).toBe(
      "Connection: Disconnected"
    );
  });
});
