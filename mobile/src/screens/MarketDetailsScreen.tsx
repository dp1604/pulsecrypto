import { useCallback, useMemo } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { RouteProp } from "@react-navigation/native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  createSelectSnapshotByPair,
  selectConnectionError,
  selectConnectionStatus,
  selectReconnectAttempt
} from "../features/markets/marketsLiveStore";
import { useMarketsLiveStore } from "../features/markets/marketsLiveStoreInstance";
import { createSelectMetadataByPair } from "../features/markets/marketsMetadataStore";
import { useMarketsMetadataStore } from "../features/markets/marketsMetadataStoreInstance";
import { colors, typography } from "../theme";
import { AnimatedPriceValue } from "../features/markets/AnimatedPriceValue";
import { MarketTopAppBar } from "../features/markets/MarketTopAppBar";
import { deriveMarketConnectionPresentation } from "../features/markets/marketConnectionPresentation";
import { MarketDepthSummary } from "../features/markets/MarketDepthSummary";
import {
  buildMarketDetailsChangePresentation,
  formatFixturePrice,
  formatFixtureVolume,
  formatLastUpdatedUtc,
  formatMarketDetailsPrice,
  formatPairDisplayLabel,
  formatPressurePercent,
  formatSpreadValue,
  getPairAssetLabels,
  MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT,
  resolveMarketDetailsChangeColor
} from "../features/markets/marketDetailsPresentation";
import { OrderBookTable } from "../features/markets/OrderBookTable";
import type { MarketsStackParamList } from "../navigation/types";

type MarketDetailsRouteProp = RouteProp<MarketsStackParamList, "MarketDetails">;
type MarketDetailsNavigationProp = NativeStackNavigationProp<
  MarketsStackParamList,
  "MarketDetails"
>;

export const MarketDetailsScreen = () => {
  const navigation = useNavigation<MarketDetailsNavigationProp>();
  const route = useRoute<MarketDetailsRouteProp>();
  const pair = route.params.pair;

  const snapshot = useMarketsLiveStore(
    useMemo(() => createSelectSnapshotByPair(pair), [pair])
  );
  const metadata = useMarketsMetadataStore(
    useMemo(() => createSelectMetadataByPair(pair), [pair])
  );
  const connectionStatus = useMarketsLiveStore(selectConnectionStatus);
  const connectionErrorMessage = useMarketsLiveStore(selectConnectionError);
  const reconnectAttempt = useMarketsLiveStore(selectReconnectAttempt);
  const reconnectLive = useMarketsLiveStore((state) => state.reconnectNow);

  const hasSnapshot = snapshot !== undefined;
  const displayName = formatPairDisplayLabel(
    snapshot?.displayName ?? metadata?.displayName,
    pair
  );
  const { baseAsset, quoteAsset } = getPairAssetLabels(pair);

  const connectionPresentation = useMemo(
    () =>
      deriveMarketConnectionPresentation({
        status: connectionStatus,
        hasSnapshot,
        reconnectAttempt,
        connectionErrorMessage
      }),
    [connectionStatus, hasSnapshot, reconnectAttempt, connectionErrorMessage]
  );

  const changePresentation = buildMarketDetailsChangePresentation(
    snapshot?.change24hPercent,
    hasSnapshot
  );
  const priceText = formatMarketDetailsPrice(snapshot?.price, hasSnapshot);
  const spreadText = hasSnapshot
    ? formatSpreadValue(snapshot.spread)
    : "—";
  const buyPressureText = hasSnapshot
    ? formatPressurePercent(snapshot.buyPressure)
    : "—";
  const sellPressureText = hasSnapshot
    ? formatPressurePercent(snapshot.sellPressure)
    : "—";
  const lastUpdatedText = hasSnapshot
    ? formatLastUpdatedUtc(snapshot.lastUpdated)
    : "Last updated unavailable";

  const buyPressureWidth = hasSnapshot
    ? Math.min(100, Math.max(0, snapshot.buyPressure))
    : 0;
  const sellPressureWidth = hasSnapshot
    ? Math.min(100, Math.max(0, snapshot.sellPressure))
    : 0;

  const handleRetry = useCallback(() => {
    reconnectLive();
  }, [reconnectLive]);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <MarketTopAppBar
        connectionStatus={connectionStatus}
        onBackPress={() => navigation.goBack()}
        pairTitle={displayName}
        reconnectAttempt={reconnectAttempt}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {connectionPresentation.showLastKnown ? (
          <Text
            accessibilityLabel="Showing last known values"
            style={styles.lastKnownBadge}
          >
            LAST KNOWN
          </Text>
        ) : null}

        <View style={styles.priceSection}>
          <Text style={styles.priceEyebrow}>LAST PRICE</Text>
          <View style={styles.priceRow}>
            <AnimatedPriceValue
              price={snapshot?.price}
              resetKey={pair}
              accessibilityLabel={`Last price ${priceText}`}
              style={styles.priceValue}
            >
              {priceText}
            </AnimatedPriceValue>
            <Text
              accessibilityLabel={changePresentation.accessibilityLabel}
              style={[
                styles.changeInline,
                {
                  color: resolveMarketDetailsChangeColor(
                    changePresentation.tone,
                    colors
                  )
                }
              ]}
            >
              {changePresentation.displayText}
            </Text>
          </View>
        </View>

        {metadata ? (
          <View
            accessibilityLabel={`24 hour high ${formatFixturePrice(metadata.high24h)}, 24 hour low ${formatFixturePrice(metadata.low24h)}, 24 hour volume ${formatFixtureVolume(metadata.volume24h)}. REST fixture metadata`}
            style={styles.fixtureGrid}
          >
            <View style={styles.fixtureItem}>
              <Text style={styles.fixtureLabel}>24H HIGH</Text>
              <Text style={styles.fixtureValue}>
                {formatFixturePrice(metadata.high24h)}
              </Text>
            </View>
            <View style={styles.fixtureItem}>
              <Text style={styles.fixtureLabel}>24H LOW</Text>
              <Text style={styles.fixtureValue}>
                {formatFixturePrice(metadata.low24h)}
              </Text>
            </View>
            <View style={styles.fixtureItem}>
              <Text style={styles.fixtureLabel}>24H VOLUME</Text>
              <Text style={styles.fixtureValue}>
                {formatFixtureVolume(metadata.volume24h)}
              </Text>
            </View>
            <Text style={styles.fixtureMetaLabel}>FIXTURE META</Text>
          </View>
        ) : null}

        <View style={styles.metricsCard}>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Spread</Text>
            <Text style={styles.metricValue}>{spreadText}</Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Buy</Text>
            <Text style={[styles.metricValue, styles.buyText]}>
              {buyPressureText}
            </Text>
          </View>
          <View style={styles.metricItem}>
            <Text style={styles.metricLabel}>Sell</Text>
            <Text style={[styles.metricValue, styles.sellText]}>
              {sellPressureText}
            </Text>
          </View>
        </View>

        <Text style={styles.lastUpdatedLine}>{lastUpdatedText}</Text>

        <View style={styles.pressureBarTrack}>
          <View
            style={[styles.pressureBarBuy, { width: `${buyPressureWidth}%` }]}
          />
          <View
            style={[styles.pressureBarSell, { width: `${sellPressureWidth}%` }]}
          />
        </View>

        {connectionPresentation.showPersistentAlert &&
        connectionPresentation.persistentAlertMessage ? (
          <View
            accessibilityRole="alert"
            style={styles.persistentAlertCard}
          >
            <Text style={styles.persistentAlertText}>
              {connectionPresentation.persistentAlertMessage}
            </Text>
            {connectionPresentation.showRetry ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Retry live market connection"
                onPress={handleRetry}
                style={styles.retryButton}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {hasSnapshot ? (
          <>
            <OrderBookTable
              bids={snapshot.bids}
              asks={snapshot.asks}
              baseAsset={baseAsset}
              quoteAsset={quoteAsset}
            />
            <MarketDepthSummary
              baseAsset={baseAsset}
              bids={snapshot.bids}
              asks={snapshot.asks}
              buyPressure={snapshot.buyPressure}
              sellPressure={snapshot.sellPressure}
            />
          </>
        ) : (
          <Text style={styles.waitingOrderBook}>
            Waiting for live order book data
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 0,
    gap: 10
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
  priceSection: {
    gap: 4
  },
  priceEyebrow: {
    ...typography.sectionEyebrow,
    color: colors.textMuted
  },
  priceRow: {
    flexDirection: MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.flexDirection,
    alignItems: MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.alignItems,
    flexWrap: MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.flexWrap,
    gap: MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.gap,
    maxWidth: MARKET_DETAILS_LAST_PRICE_ROW_LAYOUT.maxWidth
  },
  priceValue: {
    ...typography.displayPrice,
    color: colors.textPrimary,
    flexShrink: 1
  },
  changeInline: {
    ...typography.marketChange,
    flexShrink: 1
  },
  fixtureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  fixtureItem: {
    minWidth: "30%",
    flexGrow: 1,
    gap: 2
  },
  fixtureLabel: {
    ...typography.metricLabel,
    color: colors.textMuted
  },
  fixtureValue: {
    ...typography.metricValue,
    color: colors.textSecondary
  },
  fixtureMetaLabel: {
    ...typography.sectionEyebrow,
    width: "100%",
    color: colors.textMuted,
    fontSize: 9
  },
  metricsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  metricItem: {
    minWidth: "28%",
    flexGrow: 1,
    gap: 2
  },
  metricLabel: {
    ...typography.metricLabel,
    color: colors.textMuted
  },
  metricValue: {
    ...typography.metricValue,
    color: colors.textPrimary
  },
  buyText: {
    color: colors.buy
  },
  sellText: {
    color: colors.sell
  },
  lastUpdatedLine: {
    ...typography.metricValue,
    color: colors.textMuted,
    fontSize: 11
  },
  pressureBarTrack: {
    flexDirection: "row",
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
    backgroundColor: colors.surfaceElevated
  },
  pressureBarBuy: {
    backgroundColor: colors.buy,
    height: "100%"
  },
  pressureBarSell: {
    backgroundColor: colors.sell,
    height: "100%"
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
    ...typography.body,
    color: colors.textPrimary
  },
  retryButton: {
    alignSelf: "flex-start",
    minHeight: 44,
    minWidth: 88,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceElevated,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14
  },
  retryButtonText: {
    ...typography.buttonLabel,
    color: colors.textPrimary
  },
  waitingOrderBook: {
    ...typography.bodySecondary,
    color: colors.textSecondary,
    paddingVertical: 8
  }
});
