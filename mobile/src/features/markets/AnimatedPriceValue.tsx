import { memo, useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle
} from "react-native";
import { useReducedMotionPreference } from "../../hooks/useReducedMotionPreference";
import { colors } from "../../theme";
import {
  PRICE_TICK_FLASH_MIN_INTERVAL_MS,
  PRICE_TICK_INSTANT_HOLD_MS,
  PRICE_TICK_OPACITY_HOLD_MS,
  PRICE_TICK_OPACITY_IN_MS,
  PRICE_TICK_OPACITY_OUT_MS,
  PRICE_TICK_OPACITY_TOTAL_MS,
  PRICE_TICK_REDUCED_MOTION_HOLD_MS,
  classifyPriceMovement,
  isValidMotionPrice,
  shouldTriggerPriceFlash,
  type PriceMotionMode,
  type PriceMovementDirection
} from "./marketMotionPresentation";

type AnimatedPriceValueProps = {
  price: number | undefined;
  resetKey: string;
  children: string;
  style?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  motionMode?: PriceMotionMode;
};

const NEUTRAL_COLOR = colors.textPrimary;

/** Directional overlayOpacity channels — green increase, red decrease. */

const resetOverlayOpacities = (
  greenOverlayOpacity: Animated.Value,
  redOverlayOpacity: Animated.Value
) => {
  greenOverlayOpacity.stopAnimation();
  redOverlayOpacity.stopAnimation();
  greenOverlayOpacity.setValue(0);
  redOverlayOpacity.setValue(0);
};

export const AnimatedPriceValue = memo(
  ({
    price,
    resetKey,
    children,
    style,
    accessibilityLabel,
    motionMode = "animated"
  }: AnimatedPriceValueProps) => {
    const reduceMotionEnabled = useReducedMotionPreference();
    const greenOverlayOpacity = useRef(new Animated.Value(0)).current;
    const redOverlayOpacity = useRef(new Animated.Value(0)).current;
    const previousPriceRef = useRef<number | null>(null);
    const previousResetKeyRef = useRef(resetKey);
    const lastFlashAtRef = useRef<number | null>(null);
    const activeAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
    const instantTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clearTimersAndAnimations = () => {
      activeAnimationRef.current?.stop();
      activeAnimationRef.current = null;
      if (instantTimerRef.current) {
        clearTimeout(instantTimerRef.current);
        instantTimerRef.current = null;
      }
    };

    useEffect(() => {
      return () => {
        clearTimersAndAnimations();
      };
    }, []);

    useEffect(() => {
      const resetOccurred = previousResetKeyRef.current !== resetKey;
      previousResetKeyRef.current = resetKey;

      const nextPrice = isValidMotionPrice(price) ? price : null;
      const movement = classifyPriceMovement(
        previousPriceRef.current,
        nextPrice,
        resetOccurred
      );

      if (nextPrice !== null) {
        previousPriceRef.current = nextPrice;
      } else if (resetOccurred) {
        previousPriceRef.current = null;
      }

      if (resetOccurred) {
        lastFlashAtRef.current = null;
      }

      clearTimersAndAnimations();
      resetOverlayOpacities(greenOverlayOpacity, redOverlayOpacity);

      const now = Date.now();
      if (
        !shouldTriggerPriceFlash(
          movement,
          lastFlashAtRef.current,
          now,
          PRICE_TICK_FLASH_MIN_INTERVAL_MS
        )
      ) {
        return;
      }

      lastFlashAtRef.current = now;
      const useInstantFlash =
        motionMode === "instant" || reduceMotionEnabled;
      const holdMs = reduceMotionEnabled
        ? PRICE_TICK_REDUCED_MOTION_HOLD_MS
        : motionMode === "instant"
          ? PRICE_TICK_INSTANT_HOLD_MS
          : PRICE_TICK_OPACITY_TOTAL_MS;

      const activateOverlay = (
        target: Animated.Value,
        direction: Extract<PriceMovementDirection, "increase" | "decrease">
      ) => {
        if (useInstantFlash) {
          target.setValue(1);
          instantTimerRef.current = setTimeout(() => {
            target.setValue(0);
            instantTimerRef.current = null;
          }, holdMs);
          return;
        }

        const animation = Animated.sequence([
          Animated.timing(target, {
            toValue: 1,
            duration: PRICE_TICK_OPACITY_IN_MS,
            useNativeDriver: true,
            isInteraction: false
          }),
          Animated.delay(PRICE_TICK_OPACITY_HOLD_MS),
          Animated.timing(target, {
            toValue: 0,
            duration: PRICE_TICK_OPACITY_OUT_MS,
            useNativeDriver: true,
            isInteraction: false
          })
        ]);

        activeAnimationRef.current = animation;
        animation.start(() => {
          activeAnimationRef.current = null;
        });
      };

      if (movement === "increase") {
        activateOverlay(greenOverlayOpacity, "increase");
      } else if (movement === "decrease") {
        activateOverlay(redOverlayOpacity, "decrease");
      }
    }, [
      greenOverlayOpacity,
      motionMode,
      price,
      redOverlayOpacity,
      reduceMotionEnabled,
      resetKey
    ]);

    return (
      <View style={styles.stack}>
        <Text
          accessibilityLabel={accessibilityLabel}
          style={[styles.baseText, style]}
        >
          {children}
        </Text>
        <Animated.Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.overlayText,
            style,
            { color: colors.buy, opacity: greenOverlayOpacity }
          ]}
        >
          {children}
        </Animated.Text>
        <Animated.Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          pointerEvents="none"
          style={[
            styles.overlayText,
            style,
            { color: colors.sell, opacity: redOverlayOpacity }
          ]}
        >
          {children}
        </Animated.Text>
      </View>
    );
  }
);

AnimatedPriceValue.displayName = "AnimatedPriceValue";

const styles = StyleSheet.create({
  stack: {
    position: "relative",
    flexShrink: 1
  },
  baseText: {
    color: NEUTRAL_COLOR
  },
  overlayText: {
    position: "absolute",
    left: 0,
    top: 0
  }
});
