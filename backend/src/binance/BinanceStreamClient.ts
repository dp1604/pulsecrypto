import { WebSocket, type RawData } from "ws";
import { MarketStateStore } from "../market/MarketStateStore";
import { parseBinanceCombinedMessage } from "./BinanceMessageParser";
import { BinanceReconnectPolicy } from "./BinanceReconnectPolicy";
import {
  buildBinanceCombinedStreamUrl,
  type BuildBinanceCombinedStreamUrlOptions
} from "./BinanceStreamNames";

export type BinanceStreamClientLogger = {
  info(message: string, details?: Record<string, unknown>): void;
  warn(message: string, details?: Record<string, unknown>): void;
};

export type BinanceStreamClientOptions = BuildBinanceCombinedStreamUrlOptions & {
  marketStateStore: MarketStateStore;
  enabled?: boolean;
  logger?: BinanceStreamClientLogger;
  now?: () => number;
  reconnectPolicy?: BinanceReconnectPolicy;
  createWebSocket?: (url: string) => WebSocket;
};

const defaultLogger: BinanceStreamClientLogger = {
  info(message, details) {
    if (details === undefined) {
      console.info(message);
      return;
    }

    console.info(message, details);
  },
  warn(message, details) {
    if (details === undefined) {
      console.warn(message);
      return;
    }

    console.warn(message, details);
  }
};

const rawDataToString = (data: RawData): string => {
  if (Array.isArray(data)) {
    return Buffer.concat(data).toString("utf8");
  }

  return data.toString();
};

export class BinanceStreamClient {
  private readonly marketStateStore: MarketStateStore;
  private readonly enabled: boolean;
  private readonly logger: BinanceStreamClientLogger;
  private readonly now: () => number;
  private readonly reconnectPolicy: BinanceReconnectPolicy;
  private readonly createWebSocket: (url: string) => WebSocket;
  private readonly url: string;
  private readonly observedUpdateTypes = new Set<"ticker" | "depth">();
  private activeSocket: WebSocket | undefined;
  private reconnectTimer: NodeJS.Timeout | undefined;
  private stopped = true;

  constructor(options: BinanceStreamClientOptions) {
    this.marketStateStore = options.marketStateStore;
    this.enabled = options.enabled ?? true;
    this.logger = options.logger ?? defaultLogger;
    this.now = options.now ?? Date.now;
    this.reconnectPolicy = options.reconnectPolicy ?? new BinanceReconnectPolicy();
    this.createWebSocket = options.createWebSocket ?? ((url) => new WebSocket(url));
    this.url = buildBinanceCombinedStreamUrl({
      baseUrl: options.baseUrl,
      streamNames: options.streamNames
    });
  }

  start(): void {
    if (!this.enabled) {
      this.logger.info("Binance stream ingestion disabled");
      return;
    }

    if (!this.stopped) {
      return;
    }

    this.stopped = false;
    this.connect();
  }

  stop(): void {
    this.stopped = true;
    this.clearReconnectTimer();

    const socket = this.activeSocket;
    this.activeSocket = undefined;

    if (socket === undefined) {
      return;
    }

    socket.removeAllListeners("open");
    socket.removeAllListeners("message");
    socket.removeAllListeners("error");
    socket.removeAllListeners("close");

    if (
      socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING
    ) {
      socket.close(1000, "PulseCrypto backend shutting down");
      return;
    }

    if (socket.readyState !== WebSocket.CLOSED) {
      socket.terminate();
    }
  }

  private connect(): void {
    if (this.stopped || this.activeSocket !== undefined) {
      return;
    }

    try {
      const socket = this.createWebSocket(this.url);
      this.activeSocket = socket;

      socket.on("open", () => {
        this.reconnectPolicy.reset();
        this.logger.info("Binance stream connected", {
          url: this.url
        });
      });

      socket.on("message", (data) => {
        this.handleMessage(rawDataToString(data));
      });

      socket.on("error", (error) => {
        this.logger.warn("Binance stream error", {
          error: error.message
        });
      });

      socket.on("close", (code, reason) => {
        if (this.activeSocket === socket) {
          this.activeSocket = undefined;
        }

        if (this.stopped) {
          return;
        }

        this.logger.warn("Binance stream closed unexpectedly", {
          code,
          reason: reason.toString()
        });
        this.scheduleReconnect();
      });
    } catch (error) {
      this.activeSocket = undefined;
      this.logger.warn("Failed to create Binance stream socket", {
        error: error instanceof Error ? error.message : String(error)
      });
      this.scheduleReconnect();
    }
  }

  private handleMessage(message: string): void {
    const parsedMessage = parseBinanceCombinedMessage(message, this.now());

    if (parsedMessage === undefined) {
      return;
    }

    const updated =
      parsedMessage.type === "ticker"
        ? this.marketStateStore.updateTicker(parsedMessage.update)
        : this.marketStateStore.updateOrderBook(parsedMessage.update);

    if (!updated || this.observedUpdateTypes.has(parsedMessage.type)) {
      return;
    }

    this.observedUpdateTypes.add(parsedMessage.type);
    this.logger.info("Parsed Binance market update", {
      type: parsedMessage.type,
      pair: parsedMessage.update.pair
    });
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer !== undefined) {
      return;
    }

    const delayMs = this.reconnectPolicy.nextDelayMs();

    this.logger.info("Scheduling Binance stream reconnect", {
      delayMs
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect();
    }, delayMs);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer === undefined) {
      return;
    }

    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }
}
