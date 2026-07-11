import { getWebSocketUrl } from "../../config/runtimeConfig";
import { createMarketsLiveStore } from "./marketsLiveStore";
import type { WebSocketLike } from "./marketWebSocketClient";

export const useMarketsLiveStore = createMarketsLiveStore({
  getWebSocketUrl,
  createWebSocket: (url) => new WebSocket(url) as unknown as WebSocketLike
});
