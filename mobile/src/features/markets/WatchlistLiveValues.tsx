import { memo } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, typography } from "../../theme";
import { formatLivePrice } from "./liveMarketFormatting";
import { formatChange24hPresentation } from "./marketNumberPresentation";

type WatchlistLiveValuesProps = {
  displayName: string;
  displayPrice: number | undefined;
  displayChange24h: number | undefined;
};

export const WatchlistLiveValues = memo(
  ({ displayName, displayPrice, displayChange24h }: WatchlistLiveValuesProps) => {
    const hasPrice = displayPrice !== undefined;
    const livePriceText = hasPrice
      ? formatLivePrice(displayPrice)
      : "Waiting for live data";
    const liveChangePresentation = hasPrice
      ? formatChange24hPresentation(displayChange24h)
      : null;

    return (
      <>
        <View style={styles.livePriceRow}>
          <Text style={styles.liveValue}>Live price </Text>
          <Text
            accessibilityLabel={`${displayName} live price ${livePriceText}`}
            style={styles.liveValue}
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
