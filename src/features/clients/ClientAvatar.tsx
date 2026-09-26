import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useEffect, useState } from "react";
import { Text, View } from "react-native";
import { useTheme } from "@/shared/ui/theme";
import { ClientType, getClientPhotoUrl } from "./api";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?";
}

/** Client photo (from private storage) or, without one, initials — or a
 * building icon for organisations. */
export function ClientAvatar({
  name,
  photoPath,
  clientType,
  size = 48,
  localUri,
}: {
  name: string;
  photoPath: string | null;
  clientType?: ClientType;
  size?: number;
  /** Just-picked image to show while it uploads. */
  localUri?: string | null;
}) {
  const { colors, typography } = useTheme();
  const [signedUrl, setSignedUrl] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!photoPath) return;
    let cancelled = false;
    getClientPhotoUrl(photoPath)
      .then((url) => !cancelled && setSignedUrl({ path: photoPath, url }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  const uri = localUri ?? (signedUrl && signedUrl.path === photoPath ? signedUrl.url : null);
  const shape = { width: size, height: size, borderRadius: size / 2 };

  if (uri) return <Image source={{ uri }} style={shape} contentFit="cover" transition={150} accessibilityLabel={`${name}'s photo`} />;

  return (
    <View style={[shape, { alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt }]}>
      {clientType === "organization" ? (
        <Ionicons name="business-outline" size={size * 0.45} color={colors.brand} />
      ) : (
        <Text style={[typography.bodyStrong, { color: colors.brand, fontSize: size * 0.36 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}
