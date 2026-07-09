import { describe, expect, it } from "vitest";
import { parseBinanceCombinedMessage } from "./BinanceMessageParser";

const validTickerMessage = {
  stream: "btcusdt@ticker",
  data: {
    e: "24hrTicker",
    E: 1720802025000,
    s: "BTCUSDT",
    c: "109235.42",
    P: "1.82",
    h: "110000",
    l: "105000",
    v: "18250.32"
  }
};

const validDepthMessage = {
  stream: "ethusdt@depth20@100ms",
  data: {
    lastUpdateId: 123,
    bids: [
      ["4000", "2"],
      ["3999", "1"]
    ],
    asks: [
      ["4001", "3"],
      ["4002", "4"]
    ]
  }
};

describe("BinanceMessageParser", () => {
  it("parses valid ticker messages", () => {
    expect(parseBinanceCombinedMessage(validTickerMessage, 99)).toEqual({
      type: "ticker",
      update: {
        pair: "BTCUSDT",
        price: 109235.42,
        change24hPercent: 1.82,
        high24h: 110000,
        low24h: 105000,
        volume24h: 18250.32,
        timestamp: 1720802025000
      }
    });
  });

  it("parses valid ticker JSON strings", () => {
    expect(
      parseBinanceCombinedMessage(JSON.stringify(validTickerMessage), 99)
    ).toEqual({
      type: "ticker",
      update: expect.objectContaining({
        pair: "BTCUSDT"
      })
    });
  });

  it("parses valid partial depth messages using receivedAtMs as timestamp", () => {
    expect(parseBinanceCombinedMessage(validDepthMessage, 1720802025999)).toEqual(
      {
        type: "depth",
        update: {
          pair: "ETHUSDT",
          bids: [
            [4000, 2],
            [3999, 1]
          ],
          asks: [
            [4001, 3],
            [4002, 4]
          ],
          timestamp: 1720802025999
        }
      }
    );
  });

  it("ignores unknown symbols", () => {
    expect(
      parseBinanceCombinedMessage(
        {
          ...validTickerMessage,
          data: {
            ...validTickerMessage.data,
            s: "FAKEUSDT"
          }
        },
        99
      )
    ).toBeUndefined();
  });

  it("ignores malformed wrappers", () => {
    expect(parseBinanceCombinedMessage({ data: validTickerMessage.data }, 99)).toBeUndefined();
    expect(parseBinanceCombinedMessage({ stream: "btcusdt@ticker" }, 99)).toBeUndefined();
  });

  it("ignores unsupported streams", () => {
    expect(
      parseBinanceCombinedMessage(
        {
          stream: "btcusdt@trade",
          data: {
            s: "BTCUSDT",
            c: "109235.42"
          }
        },
        99
      )
    ).toBeUndefined();
  });

  it("ignores invalid ticker numbers", () => {
    expect(
      parseBinanceCombinedMessage(
        {
          ...validTickerMessage,
          data: {
            ...validTickerMessage.data,
            c: "bad"
          }
        },
        99
      )
    ).toBeUndefined();
  });

  it("ignores invalid ticker timestamps", () => {
    expect(
      parseBinanceCombinedMessage(
        {
          ...validTickerMessage,
          data: {
            ...validTickerMessage.data,
            E: -1
          }
        },
        99
      )
    ).toBeUndefined();
  });

  it("ignores invalid depth bids or asks", () => {
    expect(
      parseBinanceCombinedMessage(
        {
          ...validDepthMessage,
          data: {
            ...validDepthMessage.data,
            bids: [["bad", "1"]]
          }
        },
        99
      )
    ).toBeUndefined();
    expect(
      parseBinanceCombinedMessage(
        {
          ...validDepthMessage,
          data: {
            ...validDepthMessage.data,
            asks: "not-an-array"
          }
        },
        99
      )
    ).toBeUndefined();
  });

  it("ignores invalid depth receivedAtMs timestamps", () => {
    expect(parseBinanceCombinedMessage(validDepthMessage, Number.NaN)).toBeUndefined();
  });

  it("does not throw on random input", () => {
    const randomInputs = [
      undefined,
      null,
      true,
      42,
      "",
      "{",
      [],
      {},
      { stream: 1, data: null },
      { stream: "btcusdt@ticker", data: [] }
    ];

    for (const input of randomInputs) {
      expect(() => parseBinanceCombinedMessage(input, 99)).not.toThrow();
      expect(parseBinanceCombinedMessage(input, 99)).toBeUndefined();
    }
  });
});
