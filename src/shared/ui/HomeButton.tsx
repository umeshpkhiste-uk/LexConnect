import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable } from "react-native";
import { useTheme } from "./theme";

/** Header shortcut back to the Home tab. */
export function HomeButton({ color, size = 24 }: { color?: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={() => router.navigate("/(app)/(tabs)")} hitSlop={10} accessibilityRole="button" accessibilityLabel="Go to Home">
      <Ionicons name="home-outline" size={size} color={color ?? colors.textPrimary} />
    </Pressable>
  );
}
