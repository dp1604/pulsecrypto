import { describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import {
  type GetPairsMetaResponse,
  SUPPORTED_PAIR_SYMBOLS
} from "@pulsecrypto/shared";
import { createHttpServer } from "../server/createHttpServer";

const withServer = async <T>(
  run: (server: FastifyInstance) => Promise<T>
): Promise<T> => {
  const server = await createHttpServer();

  try {
    return await run(server);
  } finally {
    await server.close();
  }
};

describe("backend HTTP routes", () => {
  it("returns health status", async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: "GET",
        url: "/health"
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.body)).toEqual({
        status: "ok",
        service: "pulsecrypto-backend"
      });
    });
  });

  it("returns metadata for all supported pairs", async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: "GET",
        url: "/pairs/meta"
      });
      const body = JSON.parse(response.body) as GetPairsMetaResponse;

      expect(response.statusCode).toBe(200);
      expect(body.pairs.map((pair) => pair.pair).sort()).toEqual(
        [...SUPPORTED_PAIR_SYMBOLS].sort()
      );
    });
  });

  it("returns the required metadata fields for each pair", async () => {
    await withServer(async (server) => {
      const response = await server.inject({
        method: "GET",
        url: "/pairs/meta"
      });
      const body = JSON.parse(response.body) as GetPairsMetaResponse;

      for (const pair of body.pairs) {
        expect(pair).toEqual({
          pair: expect.any(String),
          displayName: expect.any(String),
          tradingStatus: "TRADING",
          high24h: expect.any(Number),
          low24h: expect.any(Number),
          volume24h: expect.any(Number)
        });
      }
    });
  });
});
