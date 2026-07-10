import { describe, expect, it } from "vitest";
import { GetPairsMetaResponseSchema } from "@pulsecrypto/shared";
import { ApiError } from "./errors";
import { createHttpClient } from "./httpClient";
import { fetchPairsMeta } from "./pairsMetaApi";

const validPayload = {
  pairs: [
    {
      pair: "BTCUSDT",
      displayName: "BTC / USDT",
      tradingStatus: "TRADING",
      high24h: 110000,
      low24h: 105000,
      volume24h: 18250.32
    }
  ]
};

describe("pairsMetaApi", () => {
  it("returns validated pair metadata", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify(validPayload), { status: 200 });

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);
    const pairs = await fetchPairsMeta(client);

    expect(pairs).toHaveLength(1);
    expect(GetPairsMetaResponseSchema.parse({ pairs })).toBeTruthy();
  });

  it("rejects contract-invalid payloads", async () => {
    const fetchImpl = async () =>
      new Response(JSON.stringify({ pairs: [{ pair: "INVALID" }] }), {
        status: 200
      });

    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(fetchPairsMeta(client)).rejects.toMatchObject({
      category: "contract"
    });
  });

  it("propagates HTTP errors", async () => {
    const fetchImpl = async () => new Response("error", { status: 500 });
    const client = createHttpClient("http://127.0.0.1:3000", fetchImpl);

    await expect(fetchPairsMeta(client)).rejects.toBeInstanceOf(ApiError);
  });
});
