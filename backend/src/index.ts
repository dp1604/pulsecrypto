import { WebSocketServer } from "ws";
import type { FastifyBaseLogger } from "fastify";
import {
  BinanceStreamClient,
  type BinanceStreamClientLogger
} from "./binance/BinanceStreamClient";
import { loadEnv } from "./config/env";
import { MarketStateStore } from "./market/MarketStateStore";
import { createHttpServer } from "./server/createHttpServer";
import { ClientConnectionManager } from "./ws/ClientConnectionManager";

const waitForWebSocketServer = (server: WebSocketServer): Promise<void> =>
  new Promise((resolve, reject) => {
    server.once("listening", () => resolve());
    server.once("error", (error) => reject(error));
  });

const closeWebSocketServer = (server: WebSocketServer): Promise<void> =>
  new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });

const readBooleanEnv = (name: string, fallback: boolean): boolean => {
  const value = process.env[name];

  if (value === undefined || value.trim() === "") {
    return fallback;
  }

  return !["0", "false", "no", "off"].includes(value.trim().toLowerCase());
};

const createBinanceLogger = (
  logger: FastifyBaseLogger
): BinanceStreamClientLogger => ({
  info(message, details) {
    if (details === undefined) {
      logger.info(message);
      return;
    }

    logger.info(details, message);
  },
  warn(message, details) {
    if (details === undefined) {
      logger.warn(message);
      return;
    }

    logger.warn(details, message);
  }
});

const start = async (): Promise<void> => {
  const env = loadEnv();
  const httpServer = await createHttpServer({ logger: true });
  const wsServer = new WebSocketServer({
    host: env.host,
    port: env.wsPort
  });
  const clientConnectionManager = new ClientConnectionManager();
  const wsReady = waitForWebSocketServer(wsServer);
  const marketStateStore = new MarketStateStore();
  const binanceStreamClient = new BinanceStreamClient({
    marketStateStore,
    baseUrl: process.env.BINANCE_STREAM_BASE_URL,
    enabled: readBooleanEnv("BINANCE_ENABLED", true),
    logger: createBinanceLogger(httpServer.log)
  });

  clientConnectionManager.attach(wsServer);

  await httpServer.listen({
    host: env.host,
    port: env.httpPort
  });
  await wsReady;

  httpServer.log.info(
    {
      httpPort: env.httpPort,
      wsPort: env.wsPort
    },
    "PulseCrypto backend foundation started"
  );
  binanceStreamClient.start();

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    httpServer.log.info({ signal }, "Stopping PulseCrypto backend foundation");

    binanceStreamClient.stop();
    clientConnectionManager.closeAll();
    await closeWebSocketServer(wsServer);
    await httpServer.close();
  };

  process.once("SIGINT", (signal) => {
    void shutdown(signal).then(() => process.exit(0));
  });

  process.once("SIGTERM", (signal) => {
    void shutdown(signal).then(() => process.exit(0));
  });
};

start().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
