import { describe, expect, it } from "vitest";
import { BinanceReconnectPolicy } from "./BinanceReconnectPolicy";

describe("BinanceReconnectPolicy", () => {
  it("increases reconnect delays exponentially and caps them", () => {
    const policy = new BinanceReconnectPolicy({
      minDelayMs: 500,
      maxDelayMs: 1500,
      jitterRatio: 0
    });

    expect(policy.nextDelayMs()).toBe(500);
    expect(policy.nextDelayMs()).toBe(1000);
    expect(policy.nextDelayMs()).toBe(1500);
    expect(policy.nextDelayMs()).toBe(1500);
  });

  it("resets delay after a successful connection", () => {
    const policy = new BinanceReconnectPolicy({
      minDelayMs: 500,
      maxDelayMs: 1500,
      jitterRatio: 0
    });

    policy.nextDelayMs();
    policy.nextDelayMs();
    policy.reset();

    expect(policy.nextDelayMs()).toBe(500);
  });

  it("applies bounded deterministic jitter", () => {
    const policy = new BinanceReconnectPolicy({
      minDelayMs: 1000,
      maxDelayMs: 15000,
      jitterRatio: 0.2,
      random: () => 1
    });

    expect(policy.nextDelayMs()).toBe(1200);
  });
});
