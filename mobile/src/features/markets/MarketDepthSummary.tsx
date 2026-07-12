import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import type { OrderBookLevel } from "@pulsecrypto/shared";
import { colors, typography } from "../../theme";
import {
  buildMarketDepthPresentation,
  formatLiquidityGapCardValue,
  MARKET_DEPTH_CENTER_DIVIDER_X,
  MARKET_DEPTH_CHART_BORDER_WIDTH_DP,
  MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
  MARKET_DEPTH_CHART_HORIZONTAL_PADDING_DP,
  MARKET_DEPTH_CHART_VERTICAL_PADDING_DP,
  MARKET_DEPTH_DIVIDER_Y_BOTTOM,
  MARKET_DEPTH_DIVIDER_Y_TOP,
  MARKET_DEPTH_LINE_STROKE_WIDTH,
  MARKET_DEPTH_SVG_VIEW_BOX,
  MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
  MARKET_DEPTH_SUMMARY_CARD_RIGHT_DP,
  type LiquidityGapClassification,
  type PressureClassification
} from "./marketDepthPresentation";

export const MARKET_DETAILS_HORIZONTAL_PADDING_DP = 12;

type MarketDepthSummaryProps = {
  baseAsset: string;
  bids: readonly OrderBookLevel[];
  asks: readonly OrderBookLevel[];
  buyPressure: number;
  sellPressure: number;
};

const liquidityTone = (
  classification: LiquidityGapClassification
): string => {
  switch (classification) {
    case "Low":
      return colors.buy;
    case "Moderate":
      return colors.warning;
    case "High":
      return colors.sell;
    default:
      return colors.textMuted;
  }
};

const pressureTone = (classification: PressureClassification): string => {
  switch (classification) {
    case "Buy Heavy":
      return colors.buy;
    case "Sell Heavy":
      return colors.sell;
    case "Balanced":
      return colors.textSecondary;
    default:
      return colors.textMuted;
  }
};

export const MarketDepthSummary = ({
  baseAsset,
  bids,
  asks,
  buyPressure,
  sellPressure
}: MarketDepthSummaryProps) => {
  const presentation = useMemo(
    () =>
      buildMarketDepthPresentation({
        baseAsset,
        bids,
        asks,
        buyPressure,
        sellPressure
      }),
    [asks, baseAsset, bids, buyPressure, sellPressure]
  );

  const { chart } = presentation;
  const liquidityGapCardValue = formatLiquidityGapCardValue(
    presentation.liquidityGapClassification,
    presentation.liquidityGapLabel
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Market depth</Text>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.bidDot]} />
          <Text style={styles.legendText}>
            Bids: <Text style={styles.legendValue}>{presentation.bidTotalLabel}</Text>
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.askDot]} />
          <Text style={styles.legendText}>
            Asks: <Text style={styles.legendValue}>{presentation.askTotalLabel}</Text>
          </Text>
        </View>
      </View>

      <View
        accessibilityLabel={presentation.accessibilityLabel}
        accessibilityRole="summary"
        style={styles.chartCanvas}
      >
        <Svg
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          height={MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP}
          preserveAspectRatio="none"
          viewBox={MARKET_DEPTH_SVG_VIEW_BOX}
          width="100%"
        >
          {chart.bidAreaPath ? (
            <Path d={chart.bidAreaPath} fill={colors.buy} fillOpacity={0.34} />
          ) : null}
          {chart.askAreaPath ? (
            <Path d={chart.askAreaPath} fill={colors.sell} fillOpacity={0.34} />
          ) : null}
          {chart.bidLinePath ? (
            <Path
              d={chart.bidLinePath}
              fill="none"
              stroke={colors.buy}
              strokeOpacity={0.55}
              strokeWidth={MARKET_DEPTH_LINE_STROKE_WIDTH}
            />
          ) : null}
          {chart.askLinePath ? (
            <Path
              d={chart.askLinePath}
              fill="none"
              stroke={colors.sell}
              strokeOpacity={0.55}
              strokeWidth={MARKET_DEPTH_LINE_STROKE_WIDTH}
            />
          ) : null}
          <Line
            stroke={colors.border}
            strokeWidth={MARKET_DEPTH_LINE_STROKE_WIDTH}
            x1={MARKET_DEPTH_CENTER_DIVIDER_X}
            x2={MARKET_DEPTH_CENTER_DIVIDER_X}
            y1={MARKET_DEPTH_DIVIDER_Y_TOP}
            y2={MARKET_DEPTH_DIVIDER_Y_BOTTOM}
          />
        </Svg>

        <View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.summaryCard}
        >
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryHeading}>Liquidity gap</Text>
            <Text
              style={[
                styles.summaryPrimary,
                { color: liquidityTone(presentation.liquidityGapClassification) }
              ]}
            >
              {liquidityGapCardValue}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryColumn}>
            <Text style={styles.summaryHeading}>Pressure</Text>
            <Text
              style={[
                styles.summaryPrimary,
                { color: pressureTone(presentation.pressureClassification) }
              ]}
            >
              {presentation.pressureClassification}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8
  },
  title: {
    ...typography.sectionEyebrow,
    color: colors.textPrimary,
    fontSize: 13
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  legendDot: {
    width: 7,
    height: 7,
    borderRadius: 4
  },
  bidDot: {
    backgroundColor: colors.buy
  },
  askDot: {
    backgroundColor: colors.sell
  },
  legendText: {
    ...typography.depthLegend,
    color: colors.textMuted
  },
  legendValue: {
    color: colors.textPrimary,
    fontWeight: "700"
  },
  chartCanvas: {
    marginHorizontal: -MARKET_DETAILS_HORIZONTAL_PADDING_DP,
    borderWidth: MARKET_DEPTH_CHART_BORDER_WIDTH_DP,
    minHeight: MARKET_DEPTH_CHART_DISPLAY_HEIGHT_DP,
    overflow: "hidden",
    paddingTop: MARKET_DEPTH_CHART_VERTICAL_PADDING_DP,
    paddingBottom: MARKET_DEPTH_CHART_VERTICAL_PADDING_DP,
    paddingLeft: MARKET_DEPTH_CHART_HORIZONTAL_PADDING_DP,
    paddingRight: MARKET_DEPTH_CHART_HORIZONTAL_PADDING_DP,
    backgroundColor: colors.background
  },
  summaryCard: {
    position: "absolute",
    right: MARKET_DEPTH_SUMMARY_CARD_RIGHT_DP,
    bottom: MARKET_DEPTH_SUMMARY_CARD_BOTTOM_DP,
    flexDirection: "row",
    alignItems: "stretch",
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 8,
    maxWidth: "72%"
  },
  summaryColumn: {
    flexShrink: 1,
    gap: 2
  },
  summaryHeading: {
    ...typography.depthCardLabel,
    color: colors.textMuted
  },
  summaryPrimary: {
    ...typography.depthCardValue,
    color: colors.textPrimary
  },
  summaryDivider: {
    width: 1,
    backgroundColor: colors.border
  }
});
