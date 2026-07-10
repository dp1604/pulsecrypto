import AsyncStorage from "@react-native-async-storage/async-storage";
import { createFavouritesRepository } from "./favouritesRepository";
import { createMarketsPreferencesStore } from "./marketsPreferencesStore";

export const useMarketsPreferencesStore = createMarketsPreferencesStore({
  repository: createFavouritesRepository(AsyncStorage)
});
