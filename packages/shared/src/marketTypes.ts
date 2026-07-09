import { z } from "zod";
import { PairSymbolSchema } from "./pairs";

const finiteNumber = () => z.number().finite();
const nonNegativeFiniteNumber = () => finiteNumber().nonnegative();

export const OrderBookLevelSchema = z
  .object({
    price: nonNegativeFiniteNumber(),
    quantity: nonNegativeFiniteNumber(),
    total: nonNegativeFiniteNumber()
  })
  .strict();

export type OrderBookLevel = z.infer<typeof OrderBookLevelSchema>;

export const MarketSnapshotSchema = z
  .object({
    pair: PairSymbolSchema,
    displayName: z.string().min(1),
    price: nonNegativeFiniteNumber(),
    change24hPercent: finiteNumber(),
    spread: nonNegativeFiniteNumber(),
    buyPressure: finiteNumber().min(0).max(100),
    sellPressure: finiteNumber().min(0).max(100),
    bids: z.array(OrderBookLevelSchema),
    asks: z.array(OrderBookLevelSchema),
    lastUpdated: z.number().int().nonnegative()
  })
  .strict();

export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;
