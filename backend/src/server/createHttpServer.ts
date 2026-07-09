import Fastify, { type FastifyInstance } from "fastify";
import { registerRoutes } from "./routes";

export type CreateHttpServerOptions = {
  logger?: boolean;
};

export const createHttpServer = async (
  options: CreateHttpServerOptions = {}
): Promise<FastifyInstance> => {
  const server = Fastify({
    logger: options.logger ?? false
  });

  await registerRoutes(server);

  return server;
};
