import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LanguageCode } from "./languages";

const STORAGE_KEY = "app.language";

export async function getLanguagePreference(): Promise<LanguageCode | null> {
  try {
    return (await AsyncStorage.getItem(STORAGE_KEY)) as LanguageCode | null;
  } catch {
    return null;
  }
}

export async function setLanguagePreference(code: LanguageCode): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, code);
  } catch {
    // Non-critical: the choice still applies for this session.
  }
}
