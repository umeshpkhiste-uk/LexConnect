import { Alert, Platform } from "react-native";

/** `Alert.alert` is a no-op on react-native-web, so a plain info/error alert
 * needs a web fallback to actually be seen. Use this for single-button
 * ("OK") alerts; a destructive confirm with multiple buttons still needs
 * its own web handling. */
export function alertMessage(title: string, message?: string) {
  if (Platform.OS === "web") {
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }
  Alert.alert(title, message);
}
