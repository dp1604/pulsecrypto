import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../theme";
import { formatLivePrice } from "./liveMarketFormatting";
import { formatChange24hPresentation } from "./marketNumberPresentation";
import type { WatchlistPriceHighlightDirection } from "./watchlistPriceHighlightPresentation";

type WatchlistLiveValuesProps = {
  displayName: string;
  displayPrice: number | undefined;
  displayChange24h: number | undefined;
  priceHighlightDirection?: WatchlistPriceHighlightDirection;
};

const resolvePriceTextColor = (
  direction: WatchlistPriceHighlightDirection | undefined
): string => {
  if (direction === "increase") {
    return colors.buy;
  }

  if (direction === "decrease") {
    return colors.sell;
  }

  return colors.textPrimary;
};

export const WatchlistLiveValues = memo(
  ({
    displayName,
    displayPrice,
    displayChange24h,
    priceHighlightDirection = "none"
  }: WatchlistLiveValuesProps) => {
    const hasPrice = displayPrice !== undefined;
    const livePriceText = hasPrice
      ? formatLivePrice(displayPrice)
      : "Waiting for live data";
    const liveChangePresentation = hasPrice
      ? formatChange24hPresentation(displayChange24h)
      : null;
    const priceTextColor = resolvePriceTextColor(priceHighlightDirection);

    return (
      <>
        <View style={styles.livePriceRow}>
          <Text style={styles.liveValue}>Live price </Text>
          <Text
            accessibilityLabel={`${displayName} live price ${livePriceText}`}
            style={[styles.liveValue, { color: priceTextColor }]}
          >
            {livePriceText}
          </Text>
        </View>
        <Text
          accessibilityLabel={
            liveChangePresentation
              ? `${displayName} ${liveChangePresentation.accessibilityLabel}`
              : `${displayName} 24 hour change waiting for live data`
          }
          style={[
            styles.liveValue,
            liveChangePresentation
              ? {
                  color:
                    liveChangePresentation.direction === "positive"
                      ? colors.buy
                      : liveChangePresentation.direction === "negative"
                        ? colors.sell
                        : colors.textPrimary
                }
              : undefined
          ]}
        >
          24h change{" "}
          {liveChangePresentation
            ? liveChangePresentation.displayText
            : "Waiting for live data"}
        </Text>
      </>
    );
  }
);

WatchlistLiveValues.displayName = "WatchlistLiveValues";

const styles = StyleSheet.create({
  livePriceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center"
  },
  liveValue: {
    ...typography.marketPrice,
    color: colors.textPrimary
  }
});
