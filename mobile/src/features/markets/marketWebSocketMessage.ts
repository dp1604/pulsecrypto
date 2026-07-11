import {
  MARKET_SNAPSHOT_BATCH_TYPE,
  MarketSnapshotBatchMessageSchema,
  type MarketSnapshotBatchMessage
} from "@pulsecrypto/shared";

export const MAX_WEBSOCKET_MESSAGE_LENGTH = 1_000_000;

const CONNECTION_READY_TYPE = "connection.ready" as const;

export type MarketWebSocketParseResult =
  | { kind: "batch"; batch: MarketSnapshotBatchMessage }
  | { kind: "ignored" }
  | { kind: "invalid" };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseMarketWebSocketMessage = (
  data: unknown
): MarketWebSocketParseResult => {
  if (typeof data !== "string") {
    return { kind: "invalid" };
  }

  if (data.length > MAX_WEBSOCKET_MESSAGE_LENGTH) {
    return { kind: "invalid" };
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(data);
  } catch {
    return { kind: "invalid" };
  }

  if (!isRecord(parsed) || typeof parsed.type !== "string") {
    return { kind: "invalid" };
  }

  if (parsed.type === CONNECTION_READY_TYPE) {
    return { kind: "ignored" };
  }

  if (parsed.type !== MARKET_SNAPSHOT_BATCH_TYPE) {
    return { kind: "ignored" };
  }

  const result = MarketSnapshotBatchMessageSchema.safeParse(parsed);

  if (!result.success) {
    return { kind: "invalid" };
  }

  return { kind: "batch", batch: result.data };
};
