import { memo, useEffect, useRef } from "react";
import { Animated, Platform, StyleSheet, Text, View } from "react-native";
import type { OrderBookLevel } from "@pulsecrypto/shared";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { colors, typography } from "../../theme";
import { formatOrderBookPrice } from "./marketNumberPresentation";
import {
  computeOrderBookRowTotal,
  computeRelativeDepthPercent,
  formatOrderBookAmount,
  formatOrderBookTotal
} from "./marketDetailsPresentation";
import {
  DEPTH_TRANSITION_DURATION_MS,
  clampDepthTargetPercent,
  resolveDepthAnimationTarget,
  shouldAnimateDepthTransition
} from "./marketMotionPresentation";
import { resolveOrderBookDepthBarStyle } from "./orderBookPresentation";

type OrderBookRowProps = {
  side: "bid" | "ask";
  level: OrderBookLevel;
  maximumAmount: number;
  rowKey: string;
};

const sideLabels = {
  bid: "Bid",
  ask: "Ask"
} as const;

const monoFontFamily = Platform.select({
  android: "monospace",
  ios: "Menlo",
  default: undefined
});

export const OrderBookRow = memo(
  ({ side, level, maximumAmount, rowKey }: OrderBookRowProps) => {
    const reduceMotionEnabled = useReducedMotionPreference();
    const total = computeOrderBookRowTotal(level);
    const depthPercent = computeRelativeDepthPercent(
      level.quantity,
      maximumAmount
    );
    const targetPercent = resolveDepthAnimationTarget(
      depthPercent,
      reduceMotionEnabled
    );
    const priceText = formatOrderBookPrice(level.price);
    const amountText = formatOrderBookAmount(level.quantity);
    const totalText = formatOrderBookTotal(total);
    const sideLabel = sideLabels[side];
    const depthColor = side === "bid" ? colors.buy : colors.sell;
    const depthWidth = useRef(new Animated.Value(targetPercent)).current;
    const previousDepthRef = useRef(targetPercent);
    const isFirstRenderRef = useRef(true);
    const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);

    useEffect(() => {
      return () => {
        activeAnimationRef.current?.stop();
        activeAnimationRef.current = null;
      };
    }, []);

    useEffect(() => {
      const previousPercent = previousDepthRef.current;
      const nextPercent = clampDepthTargetPercent(targetPercent);

      activeAnimationRef.current?.stop();
      activeAnimationRef.current = null;

      if (
        !shouldAnimateDepthTransition(
          previousPercent,
          nextPercent,
          isFirstRenderRef.current,
          reduceMotionEnabled
        )
      ) {
        depthWidth.stopAnimation();
        depthWidth.setValue(nextPercent);
        previousDepthRef.current = nextPercent;
        isFirstRenderRef.current = false;
        return;
      }

      const animation = Animated.timing(depthWidth, {
        toValue: nextPercent,
        duration: DEPTH_TRANSITION_DURATION_MS,
        useNativeDriver: false,
        isInteraction: false
      });

      activeAnimationRef.current = animation;
      animation.start(() => {
        activeAnimationRef.current = null;
        previousDepthRef.current = nextPercent;
      });
      isFirstRenderRef.current = false;
    }, [depthWidth, reduceMotionEnabled, targetPercent]);

    const animatedDepthWidth = depthWidth.interpolate({
      inputRange: [0, 100],
      outputRange: ["0%", "100%"]
    });

    const depthBarStyle = resolveOrderBookDepthBarStyle(side);

    return (
      <View
        key={rowKey}
        style={styles.row}
        accessibilityLabel={`${sideLabel} price ${priceText}, amount ${amountText}, total ${totalText}`}
      >
        <Animated.View
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[
            styles.depthBar,
            depthBarStyle,
            {
              backgroundColor: depthColor,
              width: animatedDepthWidth
            }
          ]}
        />
        <Text
          style={[styles.cell, styles.priceCell, styles.numericCell, { color: depthColor }]}
        >
          {priceText}
        </Text>
        <Text style={[styles.cell, styles.amountCell, styles.numericCell]}>
          {amountText}
        </Text>
        <Text style={[styles.cell, styles.totalCell, styles.numericCell]}>
          {totalText}
        </Text>
      </View>
    );
  }
);

OrderBookRow.displayName = "OrderBookRow";

const styles = StyleSheet.create({
  row: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 26,
    paddingVertical: 0
  },
  depthBar: {
    position: "absolute"
  },
  cell: {
    color: colors.textPrimary
  },
  numericCell: {
    fontFamily: monoFontFamily,
    fontVariant: ["tabular-nums"]
  },
  priceCell: {
    ...typography.tablePrice,
    flex: 1.1,
    color: undefined
  },
  amountCell: {
    ...typography.tableAmount,
    flex: 1,
    textAlign: "right"
  },
  totalCell: {
    ...typography.tableTotal,
    flex: 1,
    textAlign: "right"
  }
});
