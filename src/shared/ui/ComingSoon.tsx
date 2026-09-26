import { Ionicons } from "@expo/vector-icons";
import { Text } from "react-native";
import { ScreenContainer } from "./ScreenContainer";
import { useTheme } from "./theme";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
};

// Honest placeholder for modules landing in a later phase, per the build
// spec: no fake buttons or fabricated data standing in for real features.
export function ComingSoon({ icon, title, description }: Props) {
  const { colors, spacing, typography } = useTheme();

  return (
    <ScreenContainer style={{ alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={icon} size={40} color={colors.textSecondary} style={{ marginBottom: spacing.md }} />
      <Text style={[typography.subtitle, { color: colors.textPrimary, textAlign: "center" }]}>{title}</Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, textAlign: "center", marginTop: spacing.sm },
        ]}
      >
        {description}
      </Text>
    </ScreenContainer>
  );
}
