import {
  MARKET_SNAPSHOT_BATCH_TYPE,
  MarketSnapshotBatchMessageSchema,
  type MarketSnapshotBatchMessage
} from "@pulsecrypto/shared";
import { WebSocket } from "ws";
import { MarketSnapshotBuilder } from "../market/MarketSnapshotBuilder";

export type MarketBroadcastClients = {
  getClientsSnapshot(): readonly WebSocket[];
  removeClient(client: WebSocket, code?: number, reason?: string): void;
};

export type MarketBroadcasterOptions = {
  snapshotBuilder: MarketSnapshotBuilder;
  clients: MarketBroadcastClients;
  intervalMs?: number;
  maxBufferedAmountBytes?: number;
  maxConsecutiveSlowTicks?: number;
  now?: () => number;
};

const DEFAULT_INTERVAL_MS = 100;
const DEFAULT_MAX_BUFFERED_AMOUNT_BYTES = 1_000_000;
const DEFAULT_MAX_CONSECUTIVE_SLOW_TICKS = 5;
const SLOW_CONSUMER_CLOSE_CODE = 1008;
const SLOW_CONSUMER_CLOSE_REASON = "Slow consumer";

export class MarketBroadcaster {
  private readonly snapshotBuilder: MarketSnapshotBuilder;
  private readonly clients: MarketBroadcastClients;
  private readonly intervalMs: number;
  private readonly maxBufferedAmountBytes: number;
  private readonly maxConsecutiveSlowTicks: number;
  private readonly now: () => number;
  private readonly slowTickCounts = new WeakMap<WebSocket, number>();
  private broadcastTimer: NodeJS.Timeout | undefined;
  private sequence = 0;
  private running = false;

  constructor(options: MarketBroadcasterOptions) {
    this.snapshotBuilder = options.snapshotBuilder;
    this.clients = options.clients;
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.maxBufferedAmountBytes =
      options.maxBufferedAmountBytes ?? DEFAULT_MAX_BUFFERED_AMOUNT_BYTES;
    this.maxConsecutiveSlowTicks =
      options.maxConsecutiveSlowTicks ?? DEFAULT_MAX_CONSECUTIVE_SLOW_TICKS;
    this.now = options.now ?? Date.now;
  }

  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.broadcastTimer = setInterval(() => {
      this.broadcastTick();
    }, this.intervalMs);
  }

  stop(): void {
    this.running = false;

    if (this.broadcastTimer === undefined) {
      return;
    }

    clearInterval(this.broadcastTimer);
    this.broadcastTimer = undefined;
  }

  private broadcastTick(): void {
    const clients = this.clients.getClientsSnapshot();

    if (clients.length === 0) {
      return;
    }

    const message = this.buildBatchMessage();

    if (message === undefined) {
      return;
    }

    const payload = JSON.stringify(message);

    for (const client of clients) {
      this.sendToClient(client, payload);
    }
  }

  private buildBatchMessage(): MarketSnapshotBatchMessage | undefined {
    const pairs = this.snapshotBuilder.buildAllSnapshots();

    const candidate = {
      type: MARKET_SNAPSHOT_BATCH_TYPE,
      sentAt: this.now(),
      sequence: this.sequence,
      pairs
    };

    const parsed = MarketSnapshotBatchMessageSchema.safeParse(candidate);

    if (!parsed.success) {
      return undefined;
    }

    this.sequence += 1;

    return parsed.data;
  }

  private sendToClient(client: WebSocket, payload: string): void {
    if (client.readyState !== WebSocket.OPEN) {
      return;
    }

    if (client.bufferedAmount > this.maxBufferedAmountBytes) {
      const consecutiveSlowTicks = (this.slowTickCounts.get(client) ?? 0) + 1;
      this.slowTickCounts.set(client, consecutiveSlowTicks);

      if (consecutiveSlowTicks >= this.maxConsecutiveSlowTicks) {
        this.slowTickCounts.delete(client);
        this.clients.removeClient(
          client,
          SLOW_CONSUMER_CLOSE_CODE,
          SLOW_CONSUMER_CLOSE_REASON
        );
      }

      return;
    }

    this.slowTickCounts.set(client, 0);
    client.send(payload);
  }
}
