import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/ui/theme";
import { PIN_LENGTH } from "./rules";

type Props = {
  value: string;
  onChange: (value: string) => void;
  /** Digits in the PIN (always 6 for new PINs). */
  length?: number;
  error?: boolean;
};

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];

/** PIN dots plus a large numeric keypad. */
export function PinPad({ value, onChange, length, error }: Props) {
  const { colors, typography } = useTheme();
  const slots = length ?? PIN_LENGTH;

  const press = (key: string) => {
    if (key === "del") onChange(value.slice(0, -1));
    else if (value.length < slots) onChange(value + key);
  };

  return (
    <View style={{ alignItems: "center" }}>
      <View style={styles.dots} accessibilityLabel={`${value.length} digits entered`}>
        {Array.from({ length: slots }, (_, i) => (
          <View
            key={i}
            style={[
              styles.dot,
              {
                borderColor: error ? colors.danger : colors.brand,
                backgroundColor: i < value.length ? (error ? colors.danger : colors.brand) : "transparent",
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.grid}>
        {KEYS.map((key, i) =>
          key === "" ? (
            <View key={i} style={styles.key} />
          ) : (
            <Pressable
              key={i}
              onPress={() => press(key)}
              accessibilityRole="button"
              accessibilityLabel={key === "del" ? "Delete" : key}
              style={({ pressed }) => [styles.key, { backgroundColor: pressed ? colors.surfaceAlt : "transparent" }]}
            >
              {key === "del" ? (
                <Ionicons name="backspace-outline" size={26} color={colors.textPrimary} />
              ) : (
                <Text style={[typography.title, { color: colors.textPrimary, fontSize: 28, fontWeight: "500" }]}>{key}</Text>
              )}
            </Pressable>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dots: { flexDirection: "row", gap: 16, marginBottom: 28, minHeight: 16 },
  dot: { width: 16, height: 16, borderRadius: 8, borderWidth: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", width: 270, justifyContent: "space-between", rowGap: 12 },
  key: { width: 76, height: 76, borderRadius: 38, alignItems: "center", justifyContent: "center" },
});
