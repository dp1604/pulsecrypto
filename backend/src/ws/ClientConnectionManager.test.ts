import { EventEmitter } from "node:events";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocket, type WebSocketServer } from "ws";
import { ClientConnectionManager } from "./ClientConnectionManager";

class FakeClientWebSocket extends EventEmitter {
  readyState: number = WebSocket.OPEN;
  readonly sent: string[] = [];
  closedWith: { code: number; reason: string } | undefined;
  pingCount = 0;
  respondToPing = true;

  send(payload: string): void {
    this.sent.push(payload);
  }

  ping(): void {
    this.pingCount += 1;

    if (this.respondToPing) {
      this.emit("pong");
    }
  }

  close(code = 1000, reason = "client closed"): void {
    this.readyState = WebSocket.CLOSED;
    this.closedWith = { code, reason };
    this.emit("close", code, reason);
  }

  terminate(): void {
    this.close();
  }

  removeAllListeners(event?: string | symbol): this {
    return super.removeAllListeners(event);
  }
}

class FakeWebSocketServer extends EventEmitter {}

const connectClient = (
  manager: ClientConnectionManager,
  client: FakeClientWebSocket
): void => {
  const server = new FakeWebSocketServer();
  manager.attach(server as unknown as WebSocketServer);
  server.emit("connection", client);
};

describe("ClientConnectionManager", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("tracks connected clients and exposes a snapshot", () => {
    const manager = new ClientConnectionManager({ now: () => 100 });
    const client = new FakeClientWebSocket();

    connectClient(manager, client);

    expect(manager.getClientCount()).toBe(1);
    expect(manager.getClientsSnapshot()).toHaveLength(1);
    expect(JSON.parse(client.sent[0] ?? "{}")).toEqual({
      type: "connection.ready",
      serverTime: 100
    });
  });

  it("removes clients on close and error events", () => {
    const manager = new ClientConnectionManager();
    const client = new FakeClientWebSocket();

    connectClient(manager, client);
    client.emit("close", 1000, "done");

    expect(manager.getClientCount()).toBe(0);

    const errorClient = new FakeClientWebSocket();
    connectClient(manager, errorClient);
    errorClient.emit("error", new Error("socket failed"));

    expect(manager.getClientCount()).toBe(0);
  });

  it("closeAll closes every client and clears tracking", () => {
    const manager = new ClientConnectionManager();
    const first = new FakeClientWebSocket();
    const second = new FakeClientWebSocket();

    connectClient(manager, first);
    connectClient(manager, second);

    manager.closeAll();

    expect(first.closedWith?.code).toBe(1001);
    expect(second.closedWith?.code).toBe(1001);
    expect(manager.getClientCount()).toBe(0);
  });

  it("removeClient closes a tracked client explicitly", () => {
    const manager = new ClientConnectionManager();
    const client = new FakeClientWebSocket();

    connectClient(manager, client);
    manager.removeClient(client as unknown as WebSocket, 1008, "Slow consumer");

    expect(client.closedWith).toEqual({
      code: 1008,
      reason: "Slow consumer"
    });
    expect(manager.getClientCount()).toBe(0);
  });

  it("pings clients and terminates clients that miss heartbeat responses", () => {
    let now = 1_000;
    const manager = new ClientConnectionManager({
      heartbeatIntervalMs: 1_000,
      now: () => now
    });
    const responsiveClient = new FakeClientWebSocket();
    const staleClient = new FakeClientWebSocket();
    staleClient.respondToPing = false;

    connectClient(manager, responsiveClient);
    connectClient(manager, staleClient);

    manager.startHeartbeat();

    now = 2_000;
    vi.advanceTimersByTime(1_000);

    expect(responsiveClient.pingCount).toBe(1);
    expect(staleClient.pingCount).toBe(1);

    now = 3_000;
    vi.advanceTimersByTime(1_000);

    expect(staleClient.closedWith).toEqual({
      code: 1008,
      reason: "Heartbeat timeout"
    });
    expect(manager.getClientCount()).toBe(1);
  });

  it("stops heartbeat timers during shutdown", () => {
    const manager = new ClientConnectionManager({
      heartbeatIntervalMs: 1_000,
      now: () => 1_000
    });
    const client = new FakeClientWebSocket();

    connectClient(manager, client);
    manager.startHeartbeat();
    manager.closeAll();
    vi.advanceTimersByTime(5_000);

    expect(client.pingCount).toBe(0);
  });
});
