import { WebSocket, type WebSocketServer } from "ws";

const CONNECTION_READY_TYPE = "connection.ready" as const;

type ConnectionReadyMessage = {
  type: typeof CONNECTION_READY_TYPE;
  serverTime: number;
};

export class ClientConnectionManager {
  private readonly clients = new Set<WebSocket>();

  attach(server: WebSocketServer): void {
    server.on("connection", (client) => {
      this.track(client);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  closeAll(): void {
    for (const client of this.clients) {
      client.close(1001, "Server shutting down");
    }

    this.clients.clear();
  }

  private track(client: WebSocket): void {
    this.clients.add(client);

    client.once("close", () => {
      this.clients.delete(client);
    });

    client.once("error", () => {
      this.clients.delete(client);
    });

    this.sendConnectionReady(client);
  }

  private sendConnectionReady(client: WebSocket): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ConnectionReadyMessage = {
      type: CONNECTION_READY_TYPE,
      serverTime: Date.now()
    };

    client.send(JSON.stringify(message));
  }
}
