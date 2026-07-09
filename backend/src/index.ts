import { WebSocketServer } from "ws";
import { loadEnv } from "./config/env";
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

const start = async (): Promise<void> => {
  const env = loadEnv();
  const httpServer = await createHttpServer({ logger: true });
  const wsServer = new WebSocketServer({
    host: env.host,
    port: env.wsPort
  });
  const clientConnectionManager = new ClientConnectionManager();
  const wsReady = waitForWebSocketServer(wsServer);

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

  const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
    httpServer.log.info({ signal }, "Stopping PulseCrypto backend foundation");

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
