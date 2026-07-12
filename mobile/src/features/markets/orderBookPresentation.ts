import { DEPTH_TRANSITION_DURATION_MS } from "./marketMotionPresentation";

export type OrderBookSide = "bid" | "ask";

export const ORDER_BOOK_DEPTH_BAR_OPACITY = 0.14;
export const ORDER_BOOK_ROW_HEIGHT_DP = 26;
export const ORDER_BOOK_DEPTH_BAR_RADIUS = 0;
export const ORDER_BOOK_DEPTH_BAR_VERTICAL_INSET = 0;
export const ORDER_BOOK_LEVEL_GROUP_GAP = 0;

export const resolveOrderBookDepthAnchor = (
  side: OrderBookSide
): "left" | "right" => (side === "bid" ? "right" : "left");

export const resolveOrderBookDepthBarStyle = (side: OrderBookSide) => {
  const anchor = resolveOrderBookDepthAnchor(side);

  return {
    anchor,
    ...(anchor === "right" ? { right: 0 as const } : { left: 0 as const }),
    top: ORDER_BOOK_DEPTH_BAR_VERTICAL_INSET,
    bottom: ORDER_BOOK_DEPTH_BAR_VERTICAL_INSET,
    borderRadius: ORDER_BOOK_DEPTH_BAR_RADIUS,
    opacity: ORDER_BOOK_DEPTH_BAR_OPACITY
  };
};

export const isBoundedDepthTransitionDuration = (duration: number): boolean =>
  duration >= 80 && duration <= 120;

export const ORDER_BOOK_ANIMATION_DURATION_MS = DEPTH_TRANSITION_DURATION_MS;

export const resolveOrderBookLevelGroupStyle = () => ({
  gap: ORDER_BOOK_LEVEL_GROUP_GAP
});
