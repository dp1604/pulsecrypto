import { getApiBaseUrl } from "../../config/runtimeConfig";
import { createMarketsMetadataStore } from "./marketsMetadataStore";

export const useMarketsMetadataStore = createMarketsMetadataStore({
  getApiBaseUrlImpl: getApiBaseUrl
});
