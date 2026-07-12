import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { AppState } from "react-native";
import { useMarketsLiveStore } from "../features/markets/marketsLiveStoreInstance";
import { MarketDetailsScreen } from "../screens/MarketDetailsScreen";
import { MarketsScreen } from "../screens/MarketsScreen";
import type { MarketsStackParamList } from "./types";

const Stack = createNativeStackNavigator<MarketsStackParamList>();

/**
 * Owns the Markets feature WebSocket lifecycle for both Watchlist and
 * MarketDetails. Native stack keeps Watchlist mounted on push, but lifting
 * lifecycle here avoids accidental socket shutdown if screen retention changes.
 */
const MarketsLiveLifecycle = () => {
  const startLive = useMarketsLiveStore((state) => state.start);
  const stopLive = useMarketsLiveStore((state) => state.stop);
  const setLiveAppActive = useMarketsLiveStore((state) => state.setAppActive);

  useEffect(() => {
    setLiveAppActive(AppState.currentState === "active");
    startLive();

    const subscription = AppState.addEventListener("change", (nextState) => {
      setLiveAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
      stopLive();
    };
  }, [startLive, stopLive, setLiveAppActive]);

  return null;
};

export const MarketsStackNavigator = () => (
  <>
    <MarketsLiveLifecycle />
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: "none"
      }}
    >
      <Stack.Screen name="Watchlist" component={MarketsScreen} />
      <Stack.Screen name="MarketDetails" component={MarketDetailsScreen} />
    </Stack.Navigator>
  </>
);
