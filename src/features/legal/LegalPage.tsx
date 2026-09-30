import { ScrollView, Text, View } from "react-native";
import { useTheme } from "@/shared/ui/theme";
import { LEGAL_UPDATED, LegalSection } from "./legalContent";

export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, paddingBottom: spacing.xxl }}
    >
      <Text style={[typography.title, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.xs, marginBottom: spacing.lg }]}>
        Last updated: {LEGAL_UPDATED}
      </Text>
      {sections.map((section) => (
        <View key={section.heading} style={{ marginBottom: spacing.lg }}>
          <Text style={[typography.subtitle, { color: colors.textPrimary, marginBottom: spacing.xs }]}>{section.heading}</Text>
          {section.paragraphs.map((p, i) => (
            <Text key={i} style={[typography.body, { color: colors.textSecondary, marginTop: i > 0 ? spacing.xs : 0 }]}>
              {p}
            </Text>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}
