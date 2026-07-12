import { memo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme";
import { typography } from "../../theme/typography";
import type { MarketConnectionPresentation } from "./marketConnectionPresentation";

type MarketConnectionChipProps = {
  presentation: MarketConnectionPresentation;
  onRetry?: () => void;
};

const toneStyles = {
  positive: {
    dot: colors.buy,
    border: colors.buy,
    text: colors.buy,
    background: "rgba(0, 197, 122, 0.12)"
  },
  warning: {
    dot: colors.warning,
    border: colors.warning,
    text: colors.warning,
    background: "rgba(255, 184, 107, 0.12)"
  },
  neutral: {
    dot: colors.textSecondary,
    border: colors.border,
    text: colors.textSecondary,
    background: colors.surface
  },
  muted: {
    dot: colors.textMuted,
    border: colors.border,
    text: colors.textMuted,
    background: colors.surface
  },
  negative: {
    dot: colors.sell,
    border: colors.sell,
    text: colors.sell,
    background: "rgba(255, 59, 105, 0.12)"
  }
} as const;

export const MarketConnectionChip = memo(
  ({ presentation, onRetry }: MarketConnectionChipProps) => {
    const palette = toneStyles[presentation.tone];
    const label = `${presentation.compactLabel}${presentation.reconnectAttemptSuffix ?? ""}`;
    const content = (
      <>
        <View style={[styles.dot, { backgroundColor: palette.dot }]} />
        <Text style={[styles.label, { color: palette.text }]}>{label}</Text>
      </>
    );

    if (presentation.showRetry && onRetry) {
      return (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${presentation.accessibilityLabel}. Retry connection`}
          onPress={onRetry}
          style={[
            styles.chip,
            styles.interactiveChip,
            {
              borderColor: palette.border,
              backgroundColor: palette.background
            }
          ]}
        >
          {content}
        </Pressable>
      );
    }

    return (
      <View
        accessibilityLabel={presentation.accessibilityLabel}
        accessibilityRole="text"
        importantForAccessibility="yes"
        style={[
          styles.chip,
          {
            borderColor: palette.border,
            backgroundColor: palette.background
          }
        ]}
      >
        {content}
      </View>
    );
  }
);

MarketConnectionChip.displayName = "MarketConnectionChip";

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minHeight: 28
  },
  interactiveChip: {
    minHeight: 44,
    minWidth: 44,
    justifyContent: "center"
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  label: {
    ...typography.connectionStatus
  }
});
