import {
  GetPairsMetaResponseSchema,
  type PairMeta
} from "@pulsecrypto/shared";
import { ApiError } from "./errors";
import type { HttpClient } from "./httpClient";

export const PAIRS_META_PATH = "/pairs/meta";

export const fetchPairsMeta = async (
  client: HttpClient,
  signal?: AbortSignal
): Promise<PairMeta[]> => {
  const payload = await client.getJson({
    path: PAIRS_META_PATH,
    signal
  });

  try {
    const parsed = GetPairsMetaResponseSchema.parse(payload);

    return parsed.pairs;
  } catch {
    throw new ApiError(
      "contract",
      "Pair metadata response failed contract validation."
    );
  }
};
