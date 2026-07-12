import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { OrderBookLevel } from "@pulsecrypto/shared";
import { colors, typography } from "../../theme";
import { OrderBookRow } from "./OrderBookRow";
import {
  buildOrderBookColumnLabels,
  computeMaximumVisibleAmount,
  selectVisibleAskLevels,
  selectVisibleBidLevels,
  type OrderBookColumnLabels
} from "./marketDetailsPresentation";
import { resolveOrderBookLevelGroupStyle } from "./orderBookPresentation";

type OrderBookTableProps = {
  bids: readonly OrderBookLevel[];
  asks: readonly OrderBookLevel[];
  baseAsset: string;
  quoteAsset: string;
};

const levelGroupStyle = resolveOrderBookLevelGroupStyle();

const OrderBookHeader = ({
  columnLabels
}: {
  columnLabels: OrderBookColumnLabels;
}) => (
  <View
    accessibilityRole="header"
    accessibilityLabel={columnLabels.accessibilityLabel}
    style={styles.headerRow}
  >
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      numberOfLines={1}
      style={[styles.headerCell, styles.priceHeader]}
    >
      {columnLabels.price}
    </Text>
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      numberOfLines={1}
      style={[styles.headerCell, styles.amountHeader]}
    >
      {columnLabels.amount}
    </Text>
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.85}
      numberOfLines={1}
      style={[styles.headerCell, styles.totalHeader]}
    >
      {columnLabels.total}
    </Text>
  </View>
);

export const OrderBookTable = ({
  bids,
  asks,
  baseAsset,
  quoteAsset
}: OrderBookTableProps) => {
  const columnLabels = useMemo(
    () => buildOrderBookColumnLabels(baseAsset, quoteAsset),
    [baseAsset, quoteAsset]
  );
  const visibleBids = useMemo(() => selectVisibleBidLevels(bids), [bids]);
  const visibleAsks = useMemo(() => selectVisibleAskLevels(asks), [asks]);
  const maxBidAmount = useMemo(
    () => computeMaximumVisibleAmount(visibleBids),
    [visibleBids]
  );
  const maxAskAmount = useMemo(
    () => computeMaximumVisibleAmount(visibleAsks),
    [visibleAsks]
  );

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Order book</Text>

      <View style={styles.bidSection}>
        <OrderBookHeader columnLabels={columnLabels} />
        {visibleBids.length === 0 ? (
          <Text style={styles.emptySide}>No bid levels available</Text>
        ) : (
          <View style={[styles.levelGroup, levelGroupStyle]}>
            {visibleBids.map((level, index) => (
              <OrderBookRow
                key={`bid-${level.price}-${index}`}
                rowKey={`bid-${level.price}-${index}`}
                side="bid"
                level={level}
                maximumAmount={maxBidAmount}
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.sideDivider} />

      <View style={styles.askSection}>
        <OrderBookHeader columnLabels={columnLabels} />
        {visibleAsks.length === 0 ? (
          <Text style={styles.emptySide}>No ask levels available</Text>
        ) : (
          <View style={[styles.levelGroup, levelGroupStyle]}>
            {visibleAsks.map((level, index) => (
              <OrderBookRow
                key={`ask-${level.price}-${index}`}
                rowKey={`ask-${level.price}-${index}`}
                side="ask"
                level={level}
                maximumAmount={maxAskAmount}
              />
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 0
  },
  sectionTitle: {
    ...typography.sectionEyebrow,
    color: colors.textPrimary,
    marginBottom: 6
  },
  bidSection: {
    gap: 0
  },
  askSection: {
    gap: 0
  },
  levelGroup: {
    gap: 0
  },
  headerRow: {
    flexDirection: "row",
    paddingVertical: 4
  },
  headerCell: {
    ...typography.tableHeader,
    color: colors.textMuted
  },
  priceHeader: {
    flex: 1.1
  },
  amountHeader: {
    flex: 1,
    textAlign: "right"
  },
  totalHeader: {
    flex: 1,
    textAlign: "right"
  },
  sideDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 6
  },
  emptySide: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    fontSize: 12,
    paddingVertical: 6
  }
});
