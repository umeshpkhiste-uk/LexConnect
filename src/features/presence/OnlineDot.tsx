import { View } from "react-native";
import { useTheme } from "@/shared/ui/theme";
import { useIsOnline } from "./PresenceProvider";

/**
 * Green "online" dot for the bottom-right corner of an avatar. Renders
 * nothing when the advocate is offline. The parent must be position-relative
 * (any View is) and sized to the avatar.
 */
export function OnlineDot({ userId, avatarSize, inset = 0 }: { userId: string | null | undefined; avatarSize: number; inset?: number }) {
  const { colors } = useTheme();
  const isOnline = useIsOnline(userId);
  if (!isOnline) return null;
  const size = Math.max(10, Math.round(avatarSize * 0.26));
  return (
    <View
      accessibilityLabel="Online"
      style={{
        position: "absolute",
        right: inset - size * 0.15,
        bottom: inset - size * 0.15,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: "#2E9E6A",
        borderWidth: Math.max(2, size * 0.16),
        borderColor: colors.surface,
      }}
    />
  );
}
