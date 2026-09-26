import { Image } from "expo-image";
import { View } from "react-native";

const LOGO = require("../../../assets/images/logo.png");

/** The LexConnect emblem (advocate's band in a roundel), transparent corners. */
export function AppLogo({ size = 72, shadow = true }: { size?: number; shadow?: boolean }) {
  return (
    <View
      style={
        shadow
          ? {
              borderRadius: size / 2,
              shadowColor: "#0F172A",
              shadowOpacity: 0.18,
              shadowRadius: size / 8,
              shadowOffset: { width: 0, height: size / 16 },
              elevation: 6,
            }
          : undefined
      }
    >
      <Image source={LOGO} style={{ width: size, height: size }} contentFit="contain" accessibilityLabel="LexConnect logo" />
    </View>
  );
}
