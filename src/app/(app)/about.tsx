import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { ScrollView, Text, View } from "react-native";
import { SettingsGroup, SettingsRow } from "@/shared/ui/SettingsGroup";
import { AppLogo } from "@/shared/ui/AppLogo";
import { useTheme } from "@/shared/ui/theme";

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: "briefcase-outline", text: "Manage clients, cases, hearings and tasks" },
  { icon: "calendar-outline", text: "Track your hearing and meeting calendar" },
  { icon: "cash-outline", text: "Record fees and outstanding payments" },
  { icon: "people-outline", text: "Connect and message with fellow advocates" },
  { icon: "lock-closed-outline", text: "Your practice data stays private to you" },
];

export default function AboutScreen() {
  const { colors, spacing, typography } = useTheme();
  const version = Constants.expoConfig?.version ?? "1.0.0";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
        <AppLogo size={96} />
        <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.md }]}>LexxBridge</Text>
        <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs }]}>Version {version}</Text>
        <Text
          style={[typography.body, { color: colors.textSecondary, textAlign: "center", marginTop: spacing.md, paddingHorizontal: spacing.lg }]}
        >
          The professional network and practice platform for advocates.
        </Text>
      </View>

      <SettingsGroup title="What you can do">
        {FEATURES.map((f) => (
          <SettingsRow key={f.text} icon={f.icon} label={f.text} />
        ))}
      </SettingsGroup>

      <Text style={[typography.caption, { color: colors.textSecondary, textAlign: "center" }]}>
        © {new Date().getFullYear()} LexxBridge. All rights reserved.
      </Text>
    </ScrollView>
  );
}
