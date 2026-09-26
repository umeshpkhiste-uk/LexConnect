import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "./theme";

type Tone = "neutral" | "brand" | "success" | "warning" | "danger";

export function Badge({ label, tone = "neutral" }: { label: string; tone?: Tone }) {
  const { colors, radius, spacing, typography } = useTheme();

  const toneColor =
    tone === "brand"
      ? colors.brand
      : tone === "success"
        ? colors.success
        : tone === "warning"
          ? colors.warning
          : tone === "danger"
            ? colors.danger
            : colors.textSecondary;

  return (
    <View
      style={[
        styles.badge,
        {
          borderRadius: radius.pill,
          paddingHorizontal: spacing.sm,
          paddingVertical: 3,
          backgroundColor: colors.surfaceAlt,
        },
      ]}
    >
      <Text style={[typography.caption, { color: toneColor, fontWeight: "600" }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignSelf: "flex-start" },
});
