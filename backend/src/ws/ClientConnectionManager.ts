import { WebSocket, type WebSocketServer } from "ws";

const CONNECTION_READY_TYPE = "connection.ready" as const;
const HEARTBEAT_TIMEOUT_CLOSE_CODE = 1008;
const HEARTBEAT_TIMEOUT_CLOSE_REASON = "Heartbeat timeout";

type ConnectionReadyMessage = {
  type: typeof CONNECTION_READY_TYPE;
  serverTime: number;
};

export type ClientConnectionManagerOptions = {
  heartbeatIntervalMs?: number;
  now?: () => number;
};

export class ClientConnectionManager {
  private readonly clients = new Set<WebSocket>();
  private readonly lastPongAt = new WeakMap<WebSocket, number>();
  private readonly heartbeatIntervalMs: number;
  private readonly now: () => number;
  private heartbeatTimer: NodeJS.Timeout | undefined;

  constructor(options: ClientConnectionManagerOptions = {}) {
    this.heartbeatIntervalMs = options.heartbeatIntervalMs ?? 30_000;
    this.now = options.now ?? Date.now;
  }

  attach(server: WebSocketServer): void {
    server.on("connection", (client) => {
      this.track(client);
    });
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getClientsSnapshot(): readonly WebSocket[] {
    return [...this.clients];
  }

  removeClient(
    client: WebSocket,
    code = 1008,
    reason = "Client removed"
  ): void {
    if (!this.clients.has(client)) {
      return;
    }

    client.removeAllListeners("close");
    client.removeAllListeners("error");
    client.removeAllListeners("pong");

    if (
      client.readyState === WebSocket.OPEN ||
      client.readyState === WebSocket.CONNECTING
    ) {
      client.close(code, reason);
    } else if (client.readyState !== WebSocket.CLOSED) {
      client.terminate();
    }

    this.clients.delete(client);
    this.lastPongAt.delete(client);
  }

  startHeartbeat(): void {
    if (this.heartbeatTimer !== undefined) {
      return;
    }

    this.heartbeatTimer = setInterval(() => {
      this.runHeartbeat();
    }, this.heartbeatIntervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatTimer === undefined) {
      return;
    }

    clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = undefined;
  }

  closeAll(): void {
    this.stopHeartbeat();

    for (const client of this.clients) {
      client.removeAllListeners("close");
      client.removeAllListeners("error");
      client.removeAllListeners("pong");
      client.close(1001, "Server shutting down");
    }

    this.clients.clear();
  }

  private track(client: WebSocket): void {
    this.clients.add(client);
    this.lastPongAt.set(client, this.now());

    client.on("pong", () => {
      this.lastPongAt.set(client, this.now());
    });

    client.once("close", () => {
      this.clients.delete(client);
      this.lastPongAt.delete(client);
    });

    client.once("error", () => {
      this.clients.delete(client);
      this.lastPongAt.delete(client);
    });

    this.sendConnectionReady(client);
  }

  private runHeartbeat(): void {
    const heartbeatDeadline = this.now() - this.heartbeatIntervalMs;

    for (const client of this.clients) {
      if (client.readyState !== WebSocket.OPEN) {
        continue;
      }

      const lastPongAt = this.lastPongAt.get(client) ?? 0;

      if (lastPongAt < heartbeatDeadline) {
        this.removeClient(
          client,
          HEARTBEAT_TIMEOUT_CLOSE_CODE,
          HEARTBEAT_TIMEOUT_CLOSE_REASON
        );
        continue;
      }

      client.ping();
    }
  }

  private sendConnectionReady(client: WebSocket): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    const message: ConnectionReadyMessage = {
      type: CONNECTION_READY_TYPE,
      serverTime: this.now()
    };

    client.send(JSON.stringify(message));
  }
}
