import { PropsWithChildren } from "react";
import { Platform, StyleSheet, useWindowDimensions, View } from "react-native";
import { useTheme } from "./theme";

/** On the web, the app is shown in a phone-width column (like WhatsApp Web)
 * so screens designed for phones keep their layout on wide monitors. */
export const WEB_MAX_WIDTH = 480;

/** Width the app actually has to draw in: the window on phones, the
 * centred column on the web. Use this instead of useWindowDimensions. */
export function useAppWidth(): number {
  const { width } = useWindowDimensions();
  return Platform.OS === "web" ? Math.min(width, WEB_MAX_WIDTH) : width;
}

/** Centres the app in a phone-width column on wide web screens; a no-op on
 * phones. */
export function AppFrame({ children }: PropsWithChildren) {
  const { colors, scheme } = useTheme();
  const { width } = useWindowDimensions();
  if (Platform.OS !== "web") return <>{children}</>;
  const framed = width > WEB_MAX_WIDTH;
  return (
    <View style={[styles.page, { backgroundColor: framed ? (scheme === "dark" ? "#070B14" : "#E6EBF2") : colors.background }]}>
      <View
        style={[
          styles.column,
          { maxWidth: WEB_MAX_WIDTH, backgroundColor: colors.background },
          framed && styles.framedShadow,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: "center" },
  column: { flex: 1, width: "100%", overflow: "hidden" },
  framedShadow: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
});
