import { Image, type ImageSourcePropType, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { colors, typography } from "../theme";
import { resolveTabIconTint } from "./rootTabsPresentation";
import { MarketsStackNavigator } from "./MarketsStackNavigator";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TelemetryScreen } from "../screens/TelemetryScreen";
import { TerminalScreen } from "../screens/TerminalScreen";

export type RootTabParamList = {
  Terminal: undefined;
  Markets: undefined;
  Telemetry: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

const tabIcons = {
  Terminal: require("../../assets/figma/terminal-analysis.png"),
  Markets: require("../../assets/figma/markets-trend.png"),
  Telemetry: require("../../assets/figma/telemetry-bars.png"),
  Settings: require("../../assets/figma/settings.png")
} as const satisfies Record<keyof RootTabParamList, ImageSourcePropType>;

const TabIcon = ({
  source,
  focused
}: {
  source: ImageSourcePropType;
  focused: boolean;
}) => (
  <Image
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
    resizeMode="contain"
    source={source}
    style={styles.tabIcon}
    tintColor={resolveTabIconTint(focused)}
  />
);

export const RootTabs = () => (
  <Tab.Navigator
    initialRouteName="Markets"
    screenOptions={{
      headerShown: false,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingTop: 8,
        minHeight: 62
      },
      tabBarActiveTintColor: colors.buy,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: {
        ...typography.tabLabel
      }
    }}
  >
    <Tab.Screen
      name="Terminal"
      component={TerminalScreen}
      options={{
        tabBarAccessibilityLabel: "Terminal tab",
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused} source={tabIcons.Terminal} />
        )
      }}
    />
    <Tab.Screen
      name="Markets"
      component={MarketsStackNavigator}
      options={{
        tabBarAccessibilityLabel: "Markets tab",
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused} source={tabIcons.Markets} />
        )
      }}
    />
    <Tab.Screen
      name="Telemetry"
      component={TelemetryScreen}
      options={{
        tabBarAccessibilityLabel: "Telemetry tab",
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused} source={tabIcons.Telemetry} />
        )
      }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{
        tabBarAccessibilityLabel: "Settings tab",
        tabBarIcon: ({ focused }) => (
          <TabIcon focused={focused} source={tabIcons.Settings} />
        )
      }}
    />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabIcon: {
    width: 22,
    height: 22
  }
});
