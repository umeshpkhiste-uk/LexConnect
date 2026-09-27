import { Alert, Platform } from "react-native";

/**
 * A yes/no confirmation that also works on web. `Alert.alert` with a button
 * array is a silent no-op on react-native-web (its buttons, and therefore
 * their onPress handlers, never appear) — so on web this falls back to the
 * browser's own `confirm()` instead.
 */
export function confirmAsync(title: string, message: string, confirmLabel = "Confirm"): Promise<boolean> {
  if (Platform.OS === "web") {
    return Promise.resolve(typeof window !== "undefined" && window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
      { text: confirmLabel, style: "destructive", onPress: () => resolve(true) },
    ]);
  });
}
