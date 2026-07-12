import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { PairSymbol } from "@pulsecrypto/shared";
import { filterPairs } from "../features/markets/filterPairs";
import {
  formatConnectionStatusLabel
} from "../features/markets/liveMarketFormatting";
import {
  selectConnectionError,
  selectConnectionStatus,
  selectHasLiveSnapshot,
  selectReconnectAttempt
} from "../features/markets/marketsLiveStore";
import { useMarketsLiveStore } from "../features/markets/marketsLiveStoreInstance";
import { MarketConnectionChip } from "../features/markets/MarketConnectionChip";
import { deriveMarketConnectionPresentation } from "../features/markets/marketConnectionPresentation";
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
import type { MarketsStackParamList } from "../navigation/types";
import { colors, typography } from "../theme";
import { WatchlistRows } from "../features/markets/WatchlistRows";

type WatchlistNavigationProp = NativeStackNavigationProp<
  MarketsStackParamList,
  "Watchlist"
>;

export const MarketsScreen = () => {
  const navigation = useNavigation<WatchlistNavigationProp>();
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
  const reconnectAttempt = useMarketsLiveStore(selectReconnectAttempt);
  const hasLiveSnapshot = useMarketsLiveStore(selectHasLiveSnapshot);
  const reconnectLive = useMarketsLiveStore((state) => state.reconnectNow);
  const connectionPresentation = useMemo(
    () =>
      deriveMarketConnectionPresentation({
        status: connectionStatus,
        hasSnapshot: hasLiveSnapshot,
        reconnectAttempt,
        connectionErrorMessage
      }),
    [
      connectionStatus,
      hasLiveSnapshot,
      reconnectAttempt,
      connectionErrorMessage
    ]
  );

  const favouriteSet = useMemo(
    () => new Set(favouriteSymbols),
    [favouriteSymbols]
  );

  const filteredItems = useMemo(
    () => filterPairs(items, searchQuery),
    [items, searchQuery]
  );

  const connectionLabel = formatConnectionStatusLabel(connectionStatus);

  useEffect(() => {
    void load();

    return () => {
      cancel();
    };
  }, [load, cancel]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

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

  const handleOpenDetails = useCallback(
    (pair: PairSymbol) => {
      navigation.navigate("MarketDetails", { pair });
    },
    [navigation]
  );

  const showList = status === "success";

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Markets</Text>
          <MarketConnectionChip
            presentation={connectionPresentation}
            onRetry={
              connectionPresentation.showRetry ? handleReconnect : undefined
            }
          />
        </View>
        <Text style={styles.subtitle}>
          Live prices and 24-hour change from the validated WebSocket stream.
          High, low, and volume are REST fixture metadata.
        </Text>

        {connectionPresentation.showLastKnown ? (
          <Text style={styles.lastKnownBadge}>LAST KNOWN</Text>
        ) : null}

        {connectionPresentation.showPersistentAlert &&
        connectionPresentation.persistentAlertMessage ? (
          <View accessibilityRole="alert" style={styles.persistentAlertCard}>
            <Text style={styles.persistentAlertText}>
              {connectionPresentation.persistentAlertMessage}
            </Text>
            {connectionPresentation.showRetry ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry live market connection"
                onPress={handleReconnect}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry connection</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        <Text
          accessibilityLiveRegion="polite"
          accessibilityLabel={connectionLabel}
          style={styles.srOnly}
        >
          {connectionLabel}
        </Text>

        {status === "success" ? (
          <View style={styles.searchField}>
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
          </View>
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
          <WatchlistRows
            favouriteSet={favouriteSet}
            isRefreshing={isRefreshing}
            items={filteredItems}
            onOpenDetails={handleOpenDetails}
            onRefresh={handleRefresh}
            onToggleFavourite={handleToggleFavourite}
            showEmptySearch={searchQuery.trim().length > 0 && filteredItems.length === 0}
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
    paddingTop: 16,
    gap: 10
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12
  },
  title: {
    ...typography.screenTitle,
    color: colors.textPrimary,
    flex: 1
  },
  subtitle: {
    ...typography.bodySecondary,
    color: colors.textSecondary
  },
  lastKnownBadge: {
    ...typography.sectionEyebrow,
    alignSelf: "flex-start",
    color: colors.textMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2
  },
  persistentAlertCard: {
    gap: 8,
    borderWidth: 1,
    borderColor: colors.sell,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  persistentAlertText: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 18
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0
  },
  searchField: {
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12
  },
  searchInput: {
    ...typography.searchInput,
    flex: 1,
    minHeight: 42,
    color: colors.textPrimary,
    paddingVertical: 10
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
