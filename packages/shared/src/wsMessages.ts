import { z } from "zod";
import { MarketSnapshotSchema } from "./marketTypes";

export const MARKET_SNAPSHOT_BATCH_TYPE = "market.snapshot.batch" as const;

export const MarketSnapshotBatchMessageSchema = z
  .object({
    type: z.literal(MARKET_SNAPSHOT_BATCH_TYPE),
    sentAt: z.number().int().nonnegative(),
    sequence: z.number().int().nonnegative(),
    pairs: z.array(MarketSnapshotSchema)
  })
  .strict();

export type MarketSnapshotBatchMessage = z.infer<
  typeof MarketSnapshotBatchMessageSchema
>;
