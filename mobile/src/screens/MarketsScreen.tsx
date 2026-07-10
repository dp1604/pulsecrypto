import { memo, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { PairMeta } from "@pulsecrypto/shared";
import {
  selectMarketsMetadataError,
  selectMarketsMetadataItems,
  selectMarketsMetadataStatus
} from "../features/markets/marketsMetadataStore";
import { useMarketsMetadataStore } from "../features/markets/marketsMetadataStoreInstance";
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

const PairMetadataRow = memo(({ item }: { item: PairMeta }) => (
  <View style={styles.row}>
    <View style={styles.rowHeader}>
      <Text style={styles.pairLabel}>{item.displayName}</Text>
      <Text style={styles.statusLabel}>{item.tradingStatus}</Text>
    </View>
    <Text style={styles.symbolLabel}>{item.pair}</Text>
    <Text style={styles.metaLine}>
      24h volume {formatVolume(item.volume24h)}
    </Text>
    <Text style={styles.metaLine}>
      24h range {item.low24h.toLocaleString()} - {item.high24h.toLocaleString()}
    </Text>
  </View>
));

PairMetadataRow.displayName = "PairMetadataRow";

export const MarketsScreen = () => {
  const status = useMarketsMetadataStore(selectMarketsMetadataStatus);
  const items = useMarketsMetadataStore(selectMarketsMetadataItems);
  const errorMessage = useMarketsMetadataStore(selectMarketsMetadataError);
  const load = useMarketsMetadataStore((state) => state.load);
  const retry = useMarketsMetadataStore((state) => state.retry);
  const cancel = useMarketsMetadataStore((state) => state.cancel);

  useEffect(() => {
    void load();

    return () => {
      cancel();
    };
  }, [load, cancel]);

  const handleRetry = useCallback(() => {
    void retry();
  }, [retry]);

  const renderItem = useCallback(
    ({ item }: { item: PairMeta }) => <PairMetadataRow item={item} />,
    []
  );

  const keyExtractor = useCallback((item: PairMeta) => item.pair, []);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Markets</Text>
        <Text style={styles.subtitle}>
          Supported pair metadata from the PulseCrypto backend. Volume and range
          are assignment fixtures; live WebSocket pricing arrives later.
        </Text>

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

        {status === "success" ? (
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            accessibilityLabel="Supported pair metadata list"
          />
        ) : null}

        {status === "empty" ? (
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
  listContent: {
    paddingTop: 8,
    paddingBottom: 24
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
  metaLine: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20
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
    marginTop: 8,
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
