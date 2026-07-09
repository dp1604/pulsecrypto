import { z } from "zod";
import { PairSymbolSchema, TradingStatusSchema } from "./pairs";

const nonNegativeFiniteNumber = () => z.number().finite().nonnegative();

export const PairMetaSchema = z
  .object({
    pair: PairSymbolSchema,
    displayName: z.string().min(1),
    tradingStatus: TradingStatusSchema,
    high24h: nonNegativeFiniteNumber(),
    low24h: nonNegativeFiniteNumber(),
    volume24h: nonNegativeFiniteNumber()
  })
  .strict();

export type PairMeta = z.infer<typeof PairMetaSchema>;

export const GetPairsMetaResponseSchema = z
  .object({
    pairs: z.array(PairMetaSchema)
  })
  .strict();

export type GetPairsMetaResponse = z.infer<typeof GetPairsMetaResponseSchema>;
