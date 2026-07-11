import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/errors";
import {
  computeReconnectDelayMs,
  createMarketWebSocketController,
  WEB_SOCKET_CLOSED,
  WEB_SOCKET_CONNECTING,
  WEB_SOCKET_OPEN,
  type MarketConnectionStatus,
  type WebSocketLike
} from "./marketWebSocketClient";

const validSnapshot = {
  pair: "BTCUSDT",
  displayName: "BTC / USDT",
  price: 50000,
  change24hPercent: 1.5,
  spread: 10,
  buyPressure: 55,
  sellPressure: 45,
  bids: [{ price: 49990, quantity: 1, total: 1 }],
  asks: [{ price: 50010, quantity: 1, total: 1 }],
  lastUpdated: 1000
};

const makeBatch = (sequence: number) =>
  JSON.stringify({
    type: "market.snapshot.batch",
    sentAt: 1000,
    sequence,
    pairs: [validSnapshot]
  });

class FakeWebSocket implements WebSocketLike {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readyState = WEB_SOCKET_CONNECTING;
  onopen: ((event?: unknown) => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onerror: ((event?: unknown) => void) | null = null;
  onclose:
    | ((event: { code?: number; reason?: string; wasClean?: boolean }) => void)
    | null = null;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  simulateOpen() {
    this.readyState = WEB_SOCKET_OPEN;
    this.onopen?.({});
  }

  simulateMessage(data: string) {
    this.onmessage?.({ data });
  }

  simulateError() {
    this.onerror?.({});
  }

  simulateClose(code = 1006, reason = "", wasClean = false) {
    this.readyState = WEB_SOCKET_CLOSED;
    this.onclose?.({ code, reason, wasClean });
  }

  close(code?: number, reason?: string) {
    this.readyState = WEB_SOCKET_CLOSED;
    this.onclose?.({ code: code ?? 1000, reason: reason ?? "", wasClean: true });
  }
}

type ControllerHarness = {
  controller: ReturnType<typeof createMarketWebSocketController>;
  states: Array<{
    status: MarketConnectionStatus;
    reconnectAttempt: number;
    errorMessage: string | null;
  }>;
  batches: Array<{ sequence: number; socketGeneration: number }>;
  latestSocket: () => FakeWebSocket;
  setTimeoutMock: ReturnType<typeof vi.fn>;
};

const OPEN_TIMEOUT_MS = 10_000;

const getReconnectDelay = (
  setTimeoutMock: ReturnType<typeof vi.fn>
): number | undefined => {
  const reconnectCalls = setTimeoutMock.mock.calls.filter(
    ([, delay]) => delay !== OPEN_TIMEOUT_MS
  );

  return reconnectCalls.at(-1)?.[1] as number | undefined;
};

const createHarness = (overrides?: {
  random?: () => number;
  getWebSocketUrl?: () => string;
  createWebSocket?: (url: string) => WebSocketLike;
}) => {
  FakeWebSocket.instances = [];
  const states: ControllerHarness["states"] = [];
  const batches: ControllerHarness["batches"] = [];
  const setTimeoutMock = vi.fn((handler: () => void, delay?: number) =>
    setTimeout(handler, delay)
  );

  const controller = createMarketWebSocketController({
    getWebSocketUrl:
      overrides?.getWebSocketUrl ?? (() => "ws://127.0.0.1:3001"),
    createWebSocket:
      overrides?.createWebSocket ?? ((url) => new FakeWebSocket(url)),
    setTimeout: setTimeoutMock as unknown as typeof setTimeout,
    clearTimeout: clearTimeout as typeof clearTimeout,
    random: overrides?.random ?? (() => 0.5),
    now: () => 1_000,
    callbacks: {
      onConnectionState: (state) => {
        states.push(state);
      },
      onMarketBatch: (batch, socketGeneration) => {
        batches.push({ sequence: batch.sequence, socketGeneration });
      }
    }
  });

  return {
    controller,
    states,
    batches,
    setTimeoutMock,
    latestSocket: () => FakeWebSocket.instances[FakeWebSocket.instances.length - 1]
  };
};

const triggerReconnectingClose = () => {
  latestSocketFromInstances().simulateClose(1006, "", false);
};

const advanceReconnectTimer = (setTimeoutMock: ReturnType<typeof vi.fn>) => {
  const delay = getReconnectDelay(setTimeoutMock);

  if (delay !== undefined) {
    vi.advanceTimersByTime(delay);
  }
};

describe("marketWebSocketClient", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    FakeWebSocket.instances = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("start creates one socket", () => {
    const { controller, latestSocket } = createHarness();

    controller.start();

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(latestSocket().url).toBe("ws://127.0.0.1:3001");
  });

  it("duplicate start deduplicates active sockets", () => {
    const { controller } = createHarness();

    controller.start();
    controller.start();

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("open transitions connecting to connected", () => {
    const { controller, states, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();

    expect(states.map((state) => state.status)).toEqual([
      "connecting",
      "connected"
    ]);
  });

  it("first valid batch transitions connected to live", () => {
    const { controller, states, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));

    expect(states.at(-1)?.status).toBe("live");
  });

  it("malformed message does not update connection to live", () => {
    const { controller, states, latestSocket, batches } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage("{bad-json");

    expect(states.at(-1)?.status).toBe("connected");
    expect(batches).toHaveLength(0);
  });

  it("unknown message is ignored", () => {
    const { controller, batches, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(
      JSON.stringify({ type: "heartbeat", sentAt: 1 })
    );

    expect(batches).toHaveLength(0);
  });

  it("duplicate sequence is ignored", () => {
    const { controller, batches, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    latestSocket().simulateMessage(makeBatch(1));

    expect(batches).toHaveLength(1);
  });

  it("lower sequence is ignored", () => {
    const { controller, batches, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(2));
    latestSocket().simulateMessage(makeBatch(1));

    expect(batches).toHaveLength(1);
    expect(batches[0]?.sequence).toBe(2);
  });

  it("higher sequence is accepted", () => {
    const { controller, batches, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(1));
    latestSocket().simulateMessage(makeBatch(2));

    expect(batches).toHaveLength(2);
  });

  it("sequence resets on a new socket generation", () => {
    const { controller, batches, latestSocket } = createHarness();

    controller.start();
    latestSocket().simulateOpen();
    latestSocket().simulateMessage(makeBatch(5));

    controller.reconnectNow();
    const replacement = latestSocket();
    replacement.simulateOpen();
    replacement.simulateMessage(makeBatch(1));

    expect(batches).toHaveLength(2);
    expect(batches[1]?.sequence).toBe(1);
  });

  it("old socket messages are ignored after replacement", () => {
    const { controller, batches } = createHarness();

    controller.start();
    const first = FakeWebSocket.instances[0];
    first.simulateOpen();
    first.simulateMessage(makeBatch(1));

    controller.reconnectNow();
    const second = FakeWebSocket.instances[1];
    second.simulateOpen();

    first.simulateMessage(makeBatch(99));

    expect(batches).toHaveLength(1);
  });

  it("old socket close cannot alter new connection state", () => {
    const { controller, states } = createHarness();

    controller.start();
    const first = FakeWebSocket.instances[0];
    first.simulateOpen();
    first.simulateMessage(makeBatch(1));

    controller.reconnectNow();
    const second = FakeWebSocket.instances[1];
    second.simulateOpen();

    first.simulateClose();

    expect(states.at(-1)?.status).toBe("connected");
  });

  it("open timeout closes the pending socket and schedules reconnect", () => {
    const { controller, states } = createHarness();

    controller.start();
    vi.advanceTimersByTime(OPEN_TIMEOUT_MS);

    expect(states.at(-1)?.status).toBe("reconnecting");
  });

  describe("computeReconnectDelayMs", () => {
    it("schedules 400ms for first attempt with random 0", () => {
      expect(computeReconnectDelayMs(1, () => 0)).toBe(400);
    });

    it("schedules 500ms for first attempt with random 0.5", () => {
      expect(computeReconnectDelayMs(1, () => 0.5)).toBe(500);
    });

    it("schedules 600ms for first attempt with random 1", () => {
      expect(computeReconnectDelayMs(1, () => 1)).toBe(600);
    });

    it("schedules 800ms for second attempt with random 0", () => {
      expect(computeReconnectDelayMs(2, () => 0)).toBe(800);
    });

    it("schedules 1,000ms for second attempt with random 0.5", () => {
      expect(computeReconnectDelayMs(2, () => 0.5)).toBe(1_000);
    });

    it("schedules 1,200ms for second attempt with random 1", () => {
      expect(computeReconnectDelayMs(2, () => 1)).toBe(1_200);
    });

    it("never schedules above 8,000ms with positive jitter", () => {
      expect(computeReconnectDelayMs(10, () => 1)).toBe(8_000);
    });

    it("clamps out-of-range random input and never returns negative delay", () => {
      expect(computeReconnectDelayMs(1, () => -1)).toBe(400);
      expect(computeReconnectDelayMs(1, () => 2)).toBe(600);
    });
  });

  describe("reconnect timer scheduling", () => {
    it("schedules exactly 500ms after first failure with random 0.5", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => 0.5 });

      controller.start();
      latestSocketFromInstances().simulateError();

      expect(getReconnectDelay(setTimeoutMock)).toBe(500);
    });

    it("schedules exactly 400ms after first failure with random 0", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => 0 });

      controller.start();
      latestSocketFromInstances().simulateError();

      expect(getReconnectDelay(setTimeoutMock)).toBe(400);
    });

    it("schedules exactly 600ms after first failure with random 1", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => 1 });

      controller.start();
      latestSocketFromInstances().simulateError();

      expect(getReconnectDelay(setTimeoutMock)).toBe(600);
    });

    it("schedules exactly 1,000ms after second consecutive failure with random 0.5", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => 0.5 });

      controller.start();
      triggerReconnectingClose();
      advanceReconnectTimer(setTimeoutMock);
      triggerReconnectingClose();

      expect(getReconnectDelay(setTimeoutMock)).toBe(1_000);
    });

    it("reports reconnectAttempt 1 after first failure", () => {
      const { controller, states } = createHarness();

      controller.start();
      triggerReconnectingClose();

      expect(states.at(-1)?.reconnectAttempt).toBe(1);
    });

    it("reports reconnectAttempt 2 after second consecutive failure", () => {
      const { controller, states, setTimeoutMock } = createHarness();

      controller.start();
      triggerReconnectingClose();
      advanceReconnectTimer(setTimeoutMock);
      triggerReconnectingClose();

      expect(states.at(-1)?.reconnectAttempt).toBe(2);
    });

    it("resets reconnectAttempt to 0 after a successful valid batch", () => {
      const { controller, states } = createHarness();

      controller.start();
      latestSocketFromInstances().simulateOpen();
      latestSocketFromInstances().simulateMessage(makeBatch(1));

      expect(states.at(-1)?.reconnectAttempt).toBe(0);
      expect(states.at(-1)?.status).toBe("live");
    });

    it("never schedules above 8,000ms with positive jitter", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => 1 });

      controller.start();

      for (let index = 0; index < 5; index += 1) {
        triggerReconnectingClose();
        advanceReconnectTimer(setTimeoutMock);
      }

      triggerReconnectingClose();

      expect(getReconnectDelay(setTimeoutMock)).toBe(8_000);
    });

    it("clamps out-of-range random input to a non-negative timer", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => -5 });

      controller.start();
      latestSocketFromInstances().simulateError();

      expect(getReconnectDelay(setTimeoutMock)).toBe(400);
    });

    it("keeps only one reconnect timer active", () => {
      const { controller, setTimeoutMock } = createHarness();

      controller.start();
      latestSocketFromInstances().simulateError();

      const scheduledBeforeSecondError = setTimeoutMock.mock.calls.length;
      latestSocketFromInstances().simulateError();

      expect(setTimeoutMock.mock.calls.length).toBe(scheduledBeforeSecondError);
    });

    it("cancels the pending reconnect timer on reconnectNow", () => {
      const { controller, setTimeoutMock } = createHarness({ random: () => 0 });

      controller.start();
      latestSocketFromInstances().simulateError();
      const scheduledBeforeReconnectNow = setTimeoutMock.mock.calls.length;

      controller.reconnectNow();

      expect(setTimeoutMock.mock.calls.length).toBeGreaterThan(
        scheduledBeforeReconnectNow
      );
      expect(
        setTimeoutMock.mock.calls.filter(([, delay]) => delay !== OPEN_TIMEOUT_MS)
      ).toHaveLength(1);
    });

    it("cancels the pending reconnect timer on explicit stop", () => {
      const { controller, setTimeoutMock } = createHarness();

      controller.start();
      latestSocketFromInstances().simulateError();
      controller.stop();

      vi.advanceTimersByTime(20_000);

      expect(
        setTimeoutMock.mock.calls.filter(([, delay]) => delay !== OPEN_TIMEOUT_MS)
      ).toHaveLength(1);
      expect(FakeWebSocket.instances).toHaveLength(1);
    });
  });

  it("does not create a socket when inactive before start", () => {
    const { controller } = createHarness();

    controller.setAppActive(false);
    controller.start();

    expect(FakeWebSocket.instances).toHaveLength(0);
  });

  it("creates exactly one socket when returning active after inactive start", () => {
    const { controller } = createHarness();

    controller.setAppActive(false);
    controller.start();
    controller.setAppActive(true);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("does not create another socket on repeated active notification", () => {
    const { controller } = createHarness();

    controller.setAppActive(false);
    controller.start();
    controller.setAppActive(true);
    controller.setAppActive(true);

    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it("explicit stop prevents reconnect", () => {
    const { controller, states } = createHarness();

    controller.start();
    latestSocketFromInstances().simulateError();
    controller.stop();

    vi.advanceTimersByTime(20_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(states.at(-1)?.status).toBe("disconnected");
  });

  it("background pause prevents reconnect", () => {
    const { controller, states } = createHarness();

    controller.start();
    latestSocketFromInstances().simulateError();
    controller.setAppActive(false);

    vi.advanceTimersByTime(20_000);

    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(states.at(-1)?.status).toBe("paused");
  });

  it("foreground resumes connection", () => {
    const { controller } = createHarness();

    controller.start();
    controller.setAppActive(false);
    controller.setAppActive(true);

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("reconnectNow supersedes pending timer", () => {
    const { controller } = createHarness({ random: () => 0 });

    controller.start();
    latestSocketFromInstances().simulateError();
    controller.reconnectNow();

    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it("constructor throw follows reconnect path", () => {
    let attempts = 0;
    const { controller, states } = createHarness({
      createWebSocket: () => {
        attempts += 1;
        throw new Error("constructor failed");
      }
    });

    controller.start();

    expect(attempts).toBe(1);
    expect(states.at(-1)?.status).toBe("reconnecting");
  });

  it("maps configuration failure to disconnected state", () => {
    const { controller, states } = createHarness({
      getWebSocketUrl: () => {
        throw new ApiError("configuration", "missing");
      }
    });

    controller.start();

    expect(states.at(-1)?.status).toBe("disconnected");
    expect(states.at(-1)?.errorMessage).toContain("valid WebSocket URL");
  });

  it("cleanup detaches handlers on stop", () => {
    const { controller, latestSocket } = createHarness();

    controller.start();
    const socket = latestSocket();
    socket.simulateOpen();
    controller.stop();

    expect(socket.onopen).toBeNull();
    expect(socket.onmessage).toBeNull();
    expect(socket.onerror).toBeNull();
    expect(socket.onclose).toBeNull();
  });
});

const latestSocketFromInstances = () =>
  FakeWebSocket.instances[FakeWebSocket.instances.length - 1];
