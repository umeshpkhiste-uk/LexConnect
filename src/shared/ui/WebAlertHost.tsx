import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { AlertButton, PendingAlert, registerWebAlertListener } from "@/shared/lib/alert";
import { useTheme } from "./theme";

/** Renders confirmAlert()'s dialogs on web, where Alert.alert is a no-op.
 * Mount once near the app root. Renders nothing on native, where the real
 * Alert.alert already works. */
export function WebAlertHost() {
  const [pending, setPending] = useState<PendingAlert | null>(null);
  const { colors, spacing, radius, typography } = useTheme();

  useEffect(() => {
    if (Platform.OS !== "web") return;
    registerWebAlertListener(setPending);
    return () => registerWebAlertListener(null);
  }, []);

  if (Platform.OS !== "web" || !pending) return null;

  const close = (button?: AlertButton) => {
    setPending(null);
    button?.onPress?.();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => close()}>
      <Pressable style={styles.backdrop} onPress={() => close()}>
        <Pressable style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, fontSize: 17 }]}>{pending.title}</Text>
          {pending.message ? (
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>{pending.message}</Text>
          ) : null}
          <View style={{ marginTop: spacing.lg, gap: spacing.xs }}>
            {pending.buttons.map((button, i) => (
              <Pressable
                key={i}
                onPress={() => close(button)}
                style={({ pressed }) => [
                  styles.button,
                  { backgroundColor: pressed ? colors.surfaceAlt : "transparent", borderRadius: radius.md },
                ]}
              >
                <Text
                  style={[
                    typography.body,
                    {
                      textAlign: "center",
                      fontWeight: button.style === "cancel" ? "400" : "600",
                      color: button.style === "destructive" ? colors.danger : colors.brand,
                    },
                  ]}
                >
                  {button.text}
                </Text>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(15, 23, 42, 0.4)", padding: 24 },
  card: { width: "100%", maxWidth: 360 },
  button: { paddingVertical: 12 },
});
