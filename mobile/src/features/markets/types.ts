import type { PairMeta } from "@pulsecrypto/shared";

export type MarketsMetadataStatus =
  | "idle"
  | "loading"
  | "success"
  | "empty"
  | "error";

export type MarketsMetadataState = {
  status: MarketsMetadataStatus;
  items: PairMeta[];
  errorMessage: string | null;
  lastLoadedAt: number | null;
  requestGeneration: number;
  inFlightGeneration: number | null;
};

export const initialMarketsMetadataState: MarketsMetadataState = {
  status: "idle",
  items: [],
  errorMessage: null,
  lastLoadedAt: null,
  requestGeneration: 0,
  inFlightGeneration: null
};
