import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

type NotificationsModule = typeof import("expo-notifications");

/**
 * expo-notifications, or null where it can't run. Expo Go on Android dropped
 * notification support in SDK 53 and throws as soon as the module is
 * imported, so it's only loaded (lazily) on iOS, and on Android in a
 * development / store build. Everything notification-related no-ops when
 * this is null.
 */
const unsupported =
  Platform.OS === "web" || (Platform.OS === "android" && Constants.executionEnvironment === ExecutionEnvironment.StoreClient);

// eslint-disable-next-line @typescript-eslint/no-require-imports
export const Notifications: NotificationsModule | null = unsupported ? null : require("expo-notifications");
