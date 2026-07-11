import { describe, expect, it } from "vitest";
import {
  MAX_WEBSOCKET_MESSAGE_LENGTH,
  parseMarketWebSocketMessage
} from "./marketWebSocketMessage";

const validSnapshot = {
  pair: "BTCUSDT",
  displayName: "BTC / USDT",
  price: 50000,
  change24hPercent: 1.5,
  spread: 10,
  buyPressure: 55,
  sellPressure: 45,
  bids: [{ price: 49990, quantity: 1, total: 1 }],
  asks: [{ price: 50010, quantity: 1, total: 1 }],
  lastUpdated: 1000
};

const validBatch = {
  type: "market.snapshot.batch",
  sentAt: 1000,
  sequence: 1,
  pairs: [validSnapshot]
};

describe("marketWebSocketMessage", () => {
  it("parses a valid complete batch", () => {
    const result = parseMarketWebSocketMessage(JSON.stringify(validBatch));

    expect(result).toEqual({ kind: "batch", batch: validBatch });
  });

  it("parses a valid multiple-pair batch", () => {
    const batch = {
      ...validBatch,
      pairs: [
        validSnapshot,
        {
          ...validSnapshot,
          pair: "ETHUSDT",
          displayName: "ETH / USDT"
        }
      ]
    };

    const result = parseMarketWebSocketMessage(JSON.stringify(batch));

    expect(result.kind).toBe("batch");
    if (result.kind === "batch") {
      expect(result.batch.pairs).toHaveLength(2);
    }
  });

  it("ignores connection.ready safely", () => {
    const result = parseMarketWebSocketMessage(
      JSON.stringify({ type: "connection.ready", serverTime: 1000 })
    );

    expect(result).toEqual({ kind: "ignored" });
  });

  it("ignores unknown message types", () => {
    const result = parseMarketWebSocketMessage(
      JSON.stringify({ type: "heartbeat", sentAt: 1 })
    );

    expect(result).toEqual({ kind: "ignored" });
  });

  it("rejects malformed JSON", () => {
    expect(parseMarketWebSocketMessage("{not-json")).toEqual({
      kind: "invalid"
    });
  });

  it("rejects primitive JSON", () => {
    expect(parseMarketWebSocketMessage("42")).toEqual({ kind: "invalid" });
  });

  it("rejects missing type", () => {
    expect(parseMarketWebSocketMessage(JSON.stringify({ sentAt: 1 }))).toEqual(
      { kind: "invalid" }
    );
  });

  it("rejects schema-invalid pair symbols", () => {
    const batch = {
      ...validBatch,
      pairs: [{ ...validSnapshot, pair: "INVALID" }]
    };

    expect(parseMarketWebSocketMessage(JSON.stringify(batch))).toEqual({
      kind: "invalid"
    });
  });

  it("rejects non-finite numbers", () => {
    const batch = {
      ...validBatch,
      pairs: [{ ...validSnapshot, price: Number.NaN }]
    };

    expect(parseMarketWebSocketMessage(JSON.stringify(batch))).toEqual({
      kind: "invalid"
    });
  });

  it("rejects negative prohibited values", () => {
    const batch = {
      ...validBatch,
      pairs: [{ ...validSnapshot, price: -1 }]
    };

    expect(parseMarketWebSocketMessage(JSON.stringify(batch))).toEqual({
      kind: "invalid"
    });
  });

  it("rejects oversized messages before JSON parsing", () => {
    const oversized = "x".repeat(MAX_WEBSOCKET_MESSAGE_LENGTH + 1);

    expect(parseMarketWebSocketMessage(oversized)).toEqual({ kind: "invalid" });
  });

  it("rejects unsupported binary data types", () => {
    expect(parseMarketWebSocketMessage(new ArrayBuffer(8))).toEqual({
      kind: "invalid"
    });
  });

  it("rejects strict extra fields inherited from shared schema", () => {
    const batch = {
      ...validBatch,
      unexpected: true
    };

    expect(parseMarketWebSocketMessage(JSON.stringify(batch))).toEqual({
      kind: "invalid"
    });
  });
});
