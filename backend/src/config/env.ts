export type BackendEnv = {
  host: string;
  httpPort: number;
  wsPort: number;
  marketBroadcastIntervalMs: number;
  wsMaxBufferedAmountBytes: number;
  wsMaxConsecutiveSlowTicks: number;
  wsHeartbeatIntervalMs: number;
};

const DEFAULT_HOST = "0.0.0.0";
const DEFAULT_HTTP_PORT = 3000;
const DEFAULT_WS_PORT = 3001;
const DEFAULT_MARKET_BROADCAST_INTERVAL_MS = 100;
const DEFAULT_WS_MAX_BUFFERED_AMOUNT_BYTES = 1_000_000;
const DEFAULT_WS_MAX_CONSECUTIVE_SLOW_TICKS = 5;
const DEFAULT_WS_HEARTBEAT_INTERVAL_MS = 30_000;

const readPort = (name: string, fallback: number): number => {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`${name} must be an integer between 1 and 65535.`);
  }

  return parsed;
};

const readPositiveInteger = (name: string, fallback: number): number => {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsed = Number(rawValue);

  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer.`);
  }

  return parsed;
};

export const loadEnv = (): BackendEnv => ({
  host: process.env.HOST?.trim() || DEFAULT_HOST,
  httpPort: readPort("HTTP_PORT", DEFAULT_HTTP_PORT),
  wsPort: readPort("WS_PORT", DEFAULT_WS_PORT),
  marketBroadcastIntervalMs: readPositiveInteger(
    "MARKET_BROADCAST_INTERVAL_MS",
    DEFAULT_MARKET_BROADCAST_INTERVAL_MS
  ),
  wsMaxBufferedAmountBytes: readPositiveInteger(
    "WS_MAX_BUFFERED_AMOUNT_BYTES",
    DEFAULT_WS_MAX_BUFFERED_AMOUNT_BYTES
  ),
  wsMaxConsecutiveSlowTicks: readPositiveInteger(
    "WS_MAX_CONSECUTIVE_SLOW_TICKS",
    DEFAULT_WS_MAX_CONSECUTIVE_SLOW_TICKS
  ),
  wsHeartbeatIntervalMs: readPositiveInteger(
    "WS_HEARTBEAT_INTERVAL_MS",
    DEFAULT_WS_HEARTBEAT_INTERVAL_MS
  )
});
