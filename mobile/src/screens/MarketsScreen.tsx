import { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PairMeta } from "@pulsecrypto/shared";
import { filterPairs } from "../features/markets/filterPairs";
import {
  formatChange24hPercent,
  formatConnectionStatusLabel,
  formatLivePrice
} from "../features/markets/liveMarketFormatting";
import {
  createSelectSnapshotByPair,
  selectConnectionError,
  selectConnectionStatus
} from "../features/markets/marketsLiveStore";
import { useMarketsLiveStore } from "../features/markets/marketsLiveStoreInstance";
import {
  selectMarketsMetadataError,
  selectMarketsMetadataIsRefreshing,
  selectMarketsMetadataItems,
  selectMarketsMetadataRefreshError,
  selectMarketsMetadataStatus
} from "../features/markets/marketsMetadataStore";
import { useMarketsMetadataStore } from "../features/markets/marketsMetadataStoreInstance";
import {
  selectFavouriteSymbols,
  selectHydrationStatus,
  selectPersistenceErrorMessage
} from "../features/markets/marketsPreferencesStore";
import { useMarketsPreferencesStore } from "../features/markets/marketsPreferencesStoreInstance";
import { colors } from "../theme";

const formatVolume = (value: number): string => {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(2)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(2)}K`;
  }

  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2
  });
};

type PairMetadataRowProps = {
  item: PairMeta;
  isFavourite: boolean;
  onToggleFavourite: (pair: string) => void;
};

const PairMetadataRow = memo(
  ({ item, isFavourite, onToggleFavourite }: PairMetadataRowProps) => {
    const snapshot = useMarketsLiveStore(
      useMemo(() => createSelectSnapshotByPair(item.pair), [item.pair])
    );
    const favouriteLabel = isFavourite ? "Favourited" : "Favourite";
    const livePriceText = snapshot
      ? formatLivePrice(snapshot.price)
      : "Waiting for live data";
    const liveChangeText = snapshot
      ? formatChange24hPercent(snapshot.change24hPercent)
      : "Waiting for live data";

    return (
      <View style={styles.row}>
        <View style={styles.rowHeader}>
          <Text style={styles.pairLabel}>{item.displayName}</Text>
          <Text style={styles.statusLabel}>{item.tradingStatus}</Text>
        </View>
        <Text style={styles.symbolLabel}>{item.pair}</Text>
        <Text
          accessibilityLabel={`${item.displayName} live price ${livePriceText}`}
          style={styles.liveValue}
        >
          Live price {livePriceText}
        </Text>
        <Text
          accessibilityLabel={`${item.displayName} 24 hour change ${liveChangeText}`}
          style={styles.liveValue}
        >
          24h change {liveChangeText}
        </Text>
        <Text style={styles.metaLine}>
          24h volume {formatVolume(item.volume24h)}
        </Text>
        <Text style={styles.metaLine}>
          24h range {item.low24h.toLocaleString()} -{" "}
          {item.high24h.toLocaleString()}
        </Text>
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

export const MarketsScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const status = useMarketsMetadataStore(selectMarketsMetadataStatus);
  const items = useMarketsMetadataStore(selectMarketsMetadataItems);
  const errorMessage = useMarketsMetadataStore(selectMarketsMetadataError);
  const refreshErrorMessage = useMarketsMetadataStore(
    selectMarketsMetadataRefreshError
  );
  const isRefreshing = useMarketsMetadataStore(selectMarketsMetadataIsRefreshing);
  const load = useMarketsMetadataStore((state) => state.load);
  const retry = useMarketsMetadataStore((state) => state.retry);
  const refresh = useMarketsMetadataStore((state) => state.refresh);
  const cancel = useMarketsMetadataStore((state) => state.cancel);
  const favouriteSymbols = useMarketsPreferencesStore(selectFavouriteSymbols);
  const hydrationStatus = useMarketsPreferencesStore(selectHydrationStatus);
  const persistenceErrorMessage = useMarketsPreferencesStore(
    selectPersistenceErrorMessage
  );
  const hydrate = useMarketsPreferencesStore((state) => state.hydrate);
  const toggleFavourite = useMarketsPreferencesStore(
    (state) => state.toggleFavourite
  );
  const connectionStatus = useMarketsLiveStore(selectConnectionStatus);
  const connectionErrorMessage = useMarketsLiveStore(selectConnectionError);
  const startLive = useMarketsLiveStore((state) => state.start);
  const stopLive = useMarketsLiveStore((state) => state.stop);
  const setLiveAppActive = useMarketsLiveStore((state) => state.setAppActive);
  const reconnectLive = useMarketsLiveStore((state) => state.reconnectNow);

  const favouriteSet = useMemo(
    () => new Set(favouriteSymbols),
    [favouriteSymbols]
  );

  const filteredItems = useMemo(
    () => filterPairs(items, searchQuery),
    [items, searchQuery]
  );

  const connectionLabel = formatConnectionStatusLabel(connectionStatus);
  const showReconnectAction =
    connectionStatus === "reconnecting" ||
    connectionStatus === "disconnected";

  useEffect(() => {
    void load();

    return () => {
      cancel();
    };
  }, [load, cancel]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    setLiveAppActive(AppState.currentState === "active");
    startLive();

    const subscription = AppState.addEventListener("change", (nextState) => {
      setLiveAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
      stopLive();
    };
  }, [startLive, stopLive, setLiveAppActive]);

  const handleRetry = useCallback(() => {
    void retry();
  }, [retry]);

  const handleRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  const handleReconnect = useCallback(() => {
    reconnectLive();
  }, [reconnectLive]);

  const handleToggleFavourite = useCallback(
    (pair: string) => {
      void toggleFavourite(pair);
    },
    [toggleFavourite]
  );

  const renderItem = useCallback(
    ({ item }: { item: PairMeta }) => (
      <PairMetadataRow
        item={item}
        isFavourite={favouriteSet.has(item.pair)}
        onToggleFavourite={handleToggleFavourite}
      />
    ),
    [favouriteSet, handleToggleFavourite]
  );

  const keyExtractor = useCallback((item: PairMeta) => item.pair, []);

  const showList = status === "success";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Markets</Text>
        <Text style={styles.subtitle}>
          Supported pair metadata from the PulseCrypto backend. Volume and range
          are assignment fixtures; live prices and 24-hour change come from the
          validated WebSocket stream.
        </Text>

        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel={connectionLabel}
          style={styles.connectionStatus}
        >
          {connectionLabel}
        </Text>

        {connectionErrorMessage ? (
          <Text style={styles.warningText}>{connectionErrorMessage}</Text>
        ) : null}

        {showReconnectAction ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Retry live market connection"
            onPress={handleReconnect}
            style={styles.retryButton}
          >
            <Text style={styles.retryButtonText}>Retry connection</Text>
          </Pressable>
        ) : null}

        {status === "success" ? (
          <TextInput
            accessibilityLabel="Search supported pairs"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearchQuery}
            placeholder="Search pairs"
            placeholderTextColor={colors.textMuted}
            style={styles.searchInput}
            value={searchQuery}
          />
        ) : null}

        {persistenceErrorMessage ? (
          <Text
            accessibilityRole="alert"
            style={styles.warningText}
          >
            {persistenceErrorMessage}
          </Text>
        ) : null}

        {refreshErrorMessage ? (
          <Text
            accessibilityRole="alert"
            style={styles.warningText}
          >
            {refreshErrorMessage}
          </Text>
        ) : null}

        {hydrationStatus === "hydrating" ? (
          <Text style={styles.helperText}>Restoring saved favourites…</Text>
        ) : null}

        {status === "loading" || status === "idle" ? (
          <View
            style={styles.centeredState}
            accessibilityRole="progressbar"
            accessibilityLabel="Loading supported pair metadata"
          >
            <ActivityIndicator color={colors.buy} size="large" />
            <Text style={styles.stateText}>Loading supported pairs…</Text>
          </View>
        ) : null}

        {showList ? (
          <FlatList
            data={filteredItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            accessibilityLabel="Supported pair metadata list"
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.buy}
                colors={[colors.buy]}
              />
            }
            ListEmptyComponent={
              searchQuery.trim().length > 0 ? (
                <View style={styles.centeredState}>
                  <Text style={styles.stateTitle}>No matching pairs</Text>
                  <Text style={styles.stateText}>
                    Try a different symbol or display name.
                  </Text>
                </View>
              ) : null
            }
          />
        ) : null}

        {status === "empty" && items.length === 0 ? (
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>No supported pairs</Text>
            <Text style={styles.stateText}>
              The backend returned an empty metadata list.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading supported pair metadata"
              onPress={handleRetry}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}

        {status === "error" ? (
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>Unable to load metadata</Text>
            <Text style={styles.stateText}>{errorMessage}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Retry loading supported pair metadata"
              onPress={handleRetry}
              style={styles.retryButton}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 12
  },
  title: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22
  },
  connectionStatus: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  },
  searchInput: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    paddingHorizontal: 14,
    fontSize: 16
  },
  helperText: {
    color: colors.textMuted,
    fontSize: 14
  },
  warningText: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 20
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
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  pairLabel: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    flex: 1
  },
  statusLabel: {
    color: colors.buy,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.6
  },
  symbolLabel: {
    color: colors.textMuted,
    fontSize: 13
  },
  liveValue: {
    color: colors.textPrimary,
    fontSize: 15,
    lineHeight: 22
  },
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
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
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "600"
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
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center"
  },
  stateText: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  retryButton: {
    alignSelf: "flex-start",
    marginTop: 0,
    minHeight: 44,
    minWidth: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10
  },
  retryButtonText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "600"
  }
});
