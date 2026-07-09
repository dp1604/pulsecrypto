import type { FastifyInstance } from "fastify";
import { GetPairsMetaResponseSchema } from "@pulsecrypto/shared";
import { getPairMetadata } from "../config/pairs";

export const registerRoutes = async (server: FastifyInstance): Promise<void> => {
  server.get("/health", async () => ({
    status: "ok",
    service: "pulsecrypto-backend"
  }));

  server.get("/pairs/meta", async () => {
    const response = {
      pairs: getPairMetadata()
    };

    return GetPairsMetaResponseSchema.parse(response);
  });
};
