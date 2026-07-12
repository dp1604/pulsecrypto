import { memo, useCallback, useMemo } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { useShallow } from "zustand/react/shallow";
import type { PairMeta, PairSymbol } from "@pulsecrypto/shared";
import { colors, typography } from "../../theme";
import {
  formatHighLowPrice,
  formatVolume
} from "./marketNumberPresentation";
import {
  resolveWatchlistDisplayValuesForPair,
  selectWatchlistDisplayValuesAll
} from "./marketMotionPresentation";
import { useMarketsLiveStore } from "./marketsLiveStoreInstance";
import { WatchlistLiveValues } from "./WatchlistLiveValues";

type PairMetadataRowProps = {
  item: PairMeta;
  isFavourite: boolean;
  displayPrice: number | undefined;
  displayChange24h: number | undefined;
  onToggleFavourite: (pair: string) => void;
  onOpenDetails: (pair: PairSymbol) => void;
};

const PairMetadataRow = memo(
  ({
    item,
    isFavourite,
    displayPrice,
    displayChange24h,
    onToggleFavourite,
    onOpenDetails
  }: PairMetadataRowProps) => {
    const favouriteLabel = isFavourite ? "Favourited" : "Favourite";

    return (
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.displayName} market details`}
          onPress={() => onOpenDetails(item.pair)}
          style={styles.rowPressable}
        >
          <View style={styles.rowHeader}>
            <Text style={styles.pairLabel}>{item.displayName}</Text>
            <Text style={styles.statusLabel}>{item.tradingStatus}</Text>
          </View>
          <Text style={styles.symbolLabel}>{item.pair}</Text>
          <WatchlistLiveValues
            displayChange24h={displayChange24h}
            displayName={item.displayName}
            displayPrice={displayPrice}
          />
          <Text style={styles.metaLine}>
            24h volume {formatVolume(item.volume24h, true)}
          </Text>
          <Text style={styles.metaLine}>
            24h range {formatHighLowPrice(item.low24h)} -{" "}
            {formatHighLowPrice(item.high24h)}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${favouriteLabel} ${item.displayName}`}
          accessibilityState={{ selected: isFavourite }}
          onPress={() => onToggleFavourite(item.pair)}
          style={styles.favouriteButton}
        >
          <Text style={styles.favouriteButtonText}>{favouriteLabel}</Text>
        </Pressable>
      </View>
    );
  }
);

PairMetadataRow.displayName = "PairMetadataRow";

export type WatchlistRowsProps = {
  items: PairMeta[];
  favouriteSet: Set<string>;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleFavourite: (pair: string) => void;
  onOpenDetails: (pair: PairSymbol) => void;
  showEmptySearch: boolean;
};

export const WatchlistRows = memo(
  ({
    items,
    favouriteSet,
    isRefreshing,
    onRefresh,
    onToggleFavourite,
    onOpenDetails,
    showEmptySearch
  }: WatchlistRowsProps) => {
    const displayValuesAll = useMarketsLiveStore(
      useShallow(selectWatchlistDisplayValuesAll)
    );

    const renderRow = useCallback(
      (item: PairMeta, index: number) => {
        const [displayPrice, displayChange24h] = resolveWatchlistDisplayValuesForPair(
          displayValuesAll,
          item.pair
        );

        return (
          <View key={item.pair}>
            {index > 0 ? <View style={styles.separator} /> : null}
            <PairMetadataRow
              displayChange24h={displayChange24h}
              displayPrice={displayPrice}
              isFavourite={favouriteSet.has(item.pair)}
              item={item}
              onOpenDetails={onOpenDetails}
              onToggleFavourite={onToggleFavourite}
            />
          </View>
        );
      },
      [
        displayValuesAll,
        favouriteSet,
        onOpenDetails,
        onToggleFavourite
      ]
    );

    const rows = useMemo(
      () => items.map((item, index) => renderRow(item, index)),
      [items, renderRow]
    );

    return (
      <ScrollView
        accessibilityLabel="Supported pair metadata list"
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            colors={[colors.buy]}
            onRefresh={onRefresh}
            refreshing={isRefreshing}
            tintColor={colors.buy}
          />
        }
        style={styles.scrollView}
      >
        {showEmptySearch ? (
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>No matching pairs</Text>
            <Text style={styles.stateText}>
              Try a different symbol or display name.
            </Text>
          </View>
        ) : (
          rows
        )}
      </ScrollView>
    );
  }
);

WatchlistRows.displayName = "WatchlistRows";

const styles = StyleSheet.create({
  scrollView: {
    flex: 1
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 24,
    flexGrow: 1
  },
  row: {
    paddingVertical: 14,
    gap: 4
  },
  rowPressable: {
    gap: 4
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  pairLabel: {
    ...typography.marketPair,
    color: colors.textPrimary,
    flex: 1
  },
  statusLabel: {
    ...typography.connectionStatus,
    color: colors.buy
  },
  symbolLabel: {
    ...typography.marketSymbol,
    color: colors.textMuted
  },
  metaLine: {
    ...typography.bodySecondary,
    color: colors.textSecondary
  },
  favouriteButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    minHeight: 44,
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 10
  },
  favouriteButtonText: {
    ...typography.buttonLabel,
    color: colors.textPrimary
  },
  separator: {
    height: 1,
    backgroundColor: colors.border
  },
  centeredState: {
    marginTop: 24,
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12
  },
  stateTitle: {
    ...typography.placeholderTitle,
    color: colors.textPrimary,
    textAlign: "center"
  },
  stateText: {
    ...typography.placeholderBody,
    color: colors.textSecondary,
    textAlign: "center"
  }
});
