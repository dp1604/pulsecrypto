import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { View } from "react-native";
import { colors } from "../theme";
import { MarketsScreen } from "../screens/MarketsScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { TelemetryScreen } from "../screens/TelemetryScreen";
import { TerminalScreen } from "../screens/TerminalScreen";

export type RootTabParamList = {
  Markets: undefined;
  Terminal: undefined;
  Telemetry: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export const RootTabs = () => (
  <Tab.Navigator
    initialRouteName="Markets"
    screenOptions={{
      headerShown: false,
      tabBarIcon: () => <View style={{ width: 0, height: 0 }} />,
      tabBarStyle: {
        backgroundColor: colors.surface,
        borderTopColor: colors.border,
        borderTopWidth: 1,
        paddingTop: 8
      },
      tabBarActiveTintColor: colors.buy,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarLabelStyle: {
        fontSize: 11,
        fontWeight: "600"
      }
    }}
  >
    <Tab.Screen
      name="Markets"
      component={MarketsScreen}
      options={{ tabBarAccessibilityLabel: "Markets tab" }}
    />
    <Tab.Screen
      name="Terminal"
      component={TerminalScreen}
      options={{ tabBarAccessibilityLabel: "Terminal tab" }}
    />
    <Tab.Screen
      name="Telemetry"
      component={TelemetryScreen}
      options={{ tabBarAccessibilityLabel: "Telemetry tab" }}
    />
    <Tab.Screen
      name="Settings"
      component={SettingsScreen}
      options={{ tabBarAccessibilityLabel: "Settings tab" }}
    />
  </Tab.Navigator>
);
