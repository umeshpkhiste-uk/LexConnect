import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "./theme";

type Props = {
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  /** Tap-to-add ideas shown under the input, minus ones already added. */
  suggestions?: string[];
};

/** Free-text chips: type and press + (or return) to add, × to remove. */
export function TagInput({ label, values, onChange, placeholder, suggestions = [] }: Props) {
  const { colors, spacing, radius, typography } = useTheme();
  const [draft, setDraft] = useState("");

  const add = (raw: string) => {
    const value = raw.trim().replace(/\s+/g, " ");
    if (!value) return;
    if (!values.some((v) => v.toLowerCase() === value.toLowerCase())) onChange([...values, value]);
    setDraft("");
  };

  const remaining = suggestions.filter((s) => !values.some((v) => v.toLowerCase() === s.toLowerCase())).slice(0, 6);

  return (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{label}</Text>
      {values.length ? (
        <View style={[styles.chips, { marginBottom: spacing.sm }]}>
          {values.map((v) => (
            <View key={v} style={[styles.chip, { backgroundColor: colors.surfaceAlt, borderRadius: radius.pill }]}>
              <Text style={[typography.label, { color: colors.textPrimary }]}>{v}</Text>
              <Pressable onPress={() => onChange(values.filter((x) => x !== v))} hitSlop={8} accessibilityLabel={`Remove ${v}`}>
                <Ionicons name="close" size={14} color={colors.textSecondary} />
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <View style={[styles.inputRow, { borderColor: colors.border, borderRadius: radius.md, backgroundColor: colors.surface }]}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => add(draft)}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          blurOnSubmit={false}
          style={[typography.body, { flex: 1, color: colors.textPrimary, paddingVertical: 10 }]}
        />
        <Pressable onPress={() => add(draft)} disabled={!draft.trim()} hitSlop={8} accessibilityLabel={`Add ${label}`}>
          <Ionicons name="add-circle" size={26} color={draft.trim() ? colors.brand : colors.border} />
        </Pressable>
      </View>
      {remaining.length ? (
        <View style={[styles.chips, { marginTop: spacing.sm }]}>
          {remaining.map((s) => (
            <Pressable
              key={s}
              onPress={() => add(s)}
              style={[styles.chip, { borderColor: colors.border, borderWidth: 1, borderRadius: radius.pill }]}
            >
              <Ionicons name="add" size={13} color={colors.textSecondary} />
              <Text style={[typography.caption, { color: colors.textSecondary }]}>{s}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 6 },
  inputRow: { flexDirection: "row", alignItems: "center", borderWidth: 1, paddingHorizontal: 12, gap: 8 },
});
