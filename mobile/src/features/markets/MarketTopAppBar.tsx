import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { BackIcon } from "../../components/icons/BackIcon";
import { colors, typography } from "../../theme";
import {
  deriveTopAppBarConnectionPresentation,
  MARKET_TOP_APP_BAR_BACK_HEIGHT_DP,
  MARKET_TOP_APP_BAR_BACK_WIDTH_DP,
  MARKET_TOP_APP_BAR_HEIGHT_DP,
  MARKET_TOP_APP_BAR_HORIZONTAL_PADDING_DP,
  MARKET_TOP_APP_BAR_SIGNAL_HEIGHT_DP,
  MARKET_TOP_APP_BAR_SIGNAL_WIDTH_DP,
  resolveTopAppBarToneColor
} from "./marketTopAppBarPresentation";
import type { MarketConnectionStatus } from "./marketWebSocketClient";

type MarketTopAppBarProps = {
  pairTitle: string;
  connectionStatus: MarketConnectionStatus;
  reconnectAttempt?: number;
  onBackPress: () => void;
};

export const MarketTopAppBar = ({
  pairTitle,
  connectionStatus,
  reconnectAttempt = 0,
  onBackPress
}: MarketTopAppBarProps) => {
  const connection = deriveTopAppBarConnectionPresentation(
    connectionStatus,
    reconnectAttempt
  );
  const toneColor = resolveTopAppBarToneColor(connection.tone, colors);

  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Markets"
          hitSlop={8}
          onPress={onBackPress}
          style={styles.backButton}
        >
          <BackIcon
            size={MARKET_TOP_APP_BAR_BACK_WIDTH_DP}
          />
        </Pressable>

        <Text numberOfLines={1} style={styles.title}>
          {pairTitle}
        </Text>

        <View
          accessibilityLabel={connection.accessibilityLabel}
          style={styles.statusGroup}
        >
          <View style={[styles.statusDot, { backgroundColor: toneColor }]} />
          <Text style={[styles.statusLabel, { color: toneColor }]}>
            {connection.statusLabel}
          </Text>
        </View>

        <Image
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          resizeMode="contain"
          source={require("../../../assets/figma/live-signal.png")}
          style={styles.signalIcon}
          tintColor={toneColor}
        />
      </View>
      <View style={styles.divider} />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.surface
  },
  bar: {
    height: MARKET_TOP_APP_BAR_HEIGHT_DP,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: MARKET_TOP_APP_BAR_HORIZONTAL_PADDING_DP,
    gap: 8
  },
  backButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    ...typography.appBarPair,
    color: colors.textPrimary,
    flexShrink: 1,
    maxWidth: "34%"
  },
  statusGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexGrow: 1
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  statusLabel: {
    ...typography.connectionStatus
  },
  signalIcon: {
    width: MARKET_TOP_APP_BAR_SIGNAL_WIDTH_DP,
    height: MARKET_TOP_APP_BAR_SIGNAL_HEIGHT_DP
  },
  divider: {
    height: 1,
    backgroundColor: colors.border
  }
});
