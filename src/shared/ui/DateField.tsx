import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./theme";

export { fromDateOnly, toDateOnly } from "@/shared/lib/dateInput";

type Mode = "date" | "time" | "datetime";

type Props = {
  label: string;
  value: Date | null;
  onChange: (value: Date | null) => void;
  mode?: Mode;
  placeholder?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  /** Shows a clear (×) button once a value is picked. */
  optional?: boolean;
  error?: string;
};

function format(value: Date, mode: Mode) {
  const date = value.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const time = value.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });
  return mode === "date" ? date : mode === "time" ? time : `${date}, ${time}`;
}

/**
 * The app's one way to enter a date or time: a field that opens the native
 * calendar / clock. Android uses the system dialogs (date then time for
 * "datetime"); iOS shows the inline calendar in a bottom sheet.
 */
export function DateField({ label, value, onChange, mode = "date", placeholder, minimumDate, maximumDate, optional, error }: Props) {
  const { colors, spacing, radius, typography, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());
  const [iosStep, setIosStep] = useState<"date" | "time">("date");

  const open = () => {
    const initial = value ?? new Date();
    if (Platform.OS === "android") {
      const pickTime = (base: Date) =>
        DateTimePickerAndroid.open({
          value: base,
          mode: "time",
          onValueChange: (_e, picked) => {
            const next = new Date(base);
            next.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
            onChange(next);
          },
        });
      if (mode === "time") return pickTime(initial);
      DateTimePickerAndroid.open({
        value: initial,
        mode: "date",
        minimumDate,
        maximumDate,
        onValueChange: (_e, picked) => {
          const next = new Date(picked);
          next.setHours(initial.getHours(), initial.getMinutes(), 0, 0);
          if (mode === "datetime") pickTime(next);
          else onChange(next);
        },
      });
      return;
    }
    setDraft(initial);
    setIosStep(mode === "time" ? "time" : "date");
    setSheetOpen(true);
  };

  const confirmIos = () => {
    if (mode === "datetime" && iosStep === "date") {
      setIosStep("time");
      return;
    }
    onChange(draft);
    setSheetOpen(false);
  };

  return (
    <View style={{ marginBottom: spacing.md }}>
      {label ? <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>{label}</Text> : null}
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${value ? format(value, mode) : "not set"}`}
        style={[
          styles.field,
          {
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            paddingHorizontal: spacing.md,
          },
        ]}
      >
        <Ionicons name={mode === "time" ? "time-outline" : "calendar-outline"} size={20} color={colors.brand} />
        <Text style={[typography.body, { flex: 1, color: value ? colors.textPrimary : colors.textSecondary }]}>
          {value ? format(value, mode) : (placeholder ?? (mode === "time" ? "Select time" : "Select date"))}
        </Text>
        {optional && value ? (
          <Pressable onPress={() => onChange(null)} hitSlop={10} accessibilityLabel={`Clear ${label}`}>
            <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
          </Pressable>
        ) : (
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        )}
      </Pressable>
      {error ? <Text style={[typography.caption, { color: colors.danger, marginTop: 4 }]}>{error}</Text> : null}

      {Platform.OS === "ios" ? (
        <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => setSheetOpen(false)}>
          <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
            <Pressable
              style={[
                styles.sheet,
                { backgroundColor: colors.surface, paddingBottom: insets.bottom + spacing.sm, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
              ]}
            >
              <View style={[styles.sheetHeader, { borderBottomColor: colors.border, paddingHorizontal: spacing.md }]}>
                <Pressable onPress={() => setSheetOpen(false)} hitSlop={8}>
                  <Text style={[typography.body, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{label || "Select"}</Text>
                <Pressable onPress={confirmIos} hitSlop={8}>
                  <Text style={[typography.bodyStrong, { color: colors.brand }]}>
                    {mode === "datetime" && iosStep === "date" ? "Next" : "Save"}
                  </Text>
                </Pressable>
              </View>
              <DateTimePicker
                value={draft}
                mode={iosStep}
                display={iosStep === "date" ? "inline" : "spinner"}
                minimumDate={minimumDate}
                maximumDate={maximumDate}
                accentColor={colors.brand}
                themeVariant={scheme === "dark" ? "dark" : "light"}
                onValueChange={(_e, picked) => setDraft(picked)}
                style={{ alignSelf: "center" }}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 48, borderWidth: 1 },
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(15, 23, 42, 0.4)" },
  sheet: {},
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
