import { Alert, Platform } from "react-native";

export type AlertButtonStyle = "default" | "cancel" | "destructive";
export type AlertButton = { text: string; onPress?: () => void; style?: AlertButtonStyle };
export type PendingAlert = { title: string; message?: string; buttons: AlertButton[] };

type Listener = (alert: PendingAlert | null) => void;
let listener: Listener | null = null;

/** Called by WebAlertHost (mounted once near the app root) so confirmAlert
 * has somewhere to render on web. */
export function registerWebAlertListener(l: Listener | null) {
  listener = l;
}

/** Cross-platform `Alert.alert` replacement. react-native-web's `Alert.alert`
 * is a complete no-op (its entire implementation is `static alert() {}`), so
 * every confirm dialog and choice picker built on it silently does nothing
 * on the web build — the button visibly presses but nothing happens. Native
 * keeps using the real OS alert; web renders an equivalent modal via
 * WebAlertHost, driven through this same title/message/buttons shape. */
export function confirmAlert(title: string, message?: string, buttons?: AlertButton[]) {
  const resolved = buttons && buttons.length ? buttons : [{ text: "OK" }];
  if (Platform.OS !== "web") {
    Alert.alert(title, message, resolved);
    return;
  }
  if (!listener) {
    // WebAlertHost isn't mounted for some reason — fall back to the
    // browser's confirm so the action isn't silently swallowed.
    if (window.confirm(message ? `${title}\n\n${message}` : title)) {
      resolved.find((b) => b.style !== "cancel")?.onPress?.();
    }
    return;
  }
  listener({ title, message, buttons: resolved });
}

/** Single-button info/error alert. */
export function alertMessage(title: string, message?: string) {
  confirmAlert(title, message, [{ text: "OK" }]);
}
