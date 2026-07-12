import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import type { RootTabParamList } from "../navigation/RootTabs";
import { colors, typography } from "../theme";

type TerminalNavigationProp = BottomTabNavigationProp<RootTabParamList, "Terminal">;

export const TerminalScreen = () => {
  const navigation = useNavigation<TerminalNavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        <Text style={styles.title}>Terminal</Text>
        <Text style={styles.subtitle}>
          Select a market from Markets to open the live Trading Terminal.
        </Text>
        <Text style={styles.note}>
          Order book, spread, buy/sell pressure, market depth, and price motion
          are available on Market Details for each supported pair.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Markets watchlist"
          onPress={() => navigation.navigate("Markets")}
          style={styles.ctaButton}
        >
          <Text style={styles.ctaButtonText}>Open Markets</Text>
        </Pressable>
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
    ...typography.screenTitle,
    color: colors.textPrimary,
    fontSize: 28,
    letterSpacing: -0.3
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontSize: 16
  },
  note: {
    ...typography.bodySecondary,
    color: colors.textMuted
  },
  ctaButton: {
    alignSelf: "flex-start",
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.buy,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10
  },
  ctaButtonText: {
    ...typography.buttonLabel,
    color: colors.buy
  }
});
