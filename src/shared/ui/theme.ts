import { useColorScheme } from "react-native";

const palette = {
  navy900: "#0F172A",
  navy800: "#1E293B",
  navy600: "#334155",
  navy400: "#64748B",
  slate200: "#E2E8F0",
  slate100: "#F1F5F9",
  slate50: "#F8FAFC",
  white: "#FFFFFF",
  brand: "#1E3A5F",
  brandDark: "#16283F",
  gold: "#B08D57",
  success: "#1B7A43",
  danger: "#B3261E",
  warning: "#A16207",
};

export const lightColors = {
  background: palette.slate50,
  surface: palette.white,
  surfaceAlt: palette.slate100,
  border: palette.slate200,
  textPrimary: palette.navy900,
  textSecondary: palette.navy400,
  textInverse: palette.white,
  brand: palette.brand,
  brandPressed: palette.brandDark,
  accent: palette.gold,
  success: palette.success,
  danger: palette.danger,
  warning: palette.warning,
};

export const darkColors = {
  background: palette.navy900,
  surface: palette.navy800,
  surfaceAlt: "#233047",
  border: "#2D3B52",
  textPrimary: palette.slate50,
  textSecondary: "#94A3B8",
  textInverse: palette.white,
  brand: "#3B6EA5",
  brandPressed: "#5588C2",
  accent: palette.gold,
  success: "#3CB371",
  danger: "#E5675F",
  warning: "#D9A441",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const typography = {
  display: { fontSize: 28, fontWeight: "700" as const, lineHeight: 34 },
  title: { fontSize: 22, fontWeight: "700" as const, lineHeight: 28 },
  subtitle: { fontSize: 17, fontWeight: "600" as const, lineHeight: 22 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 22 },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  label: { fontSize: 13, fontWeight: "600" as const, lineHeight: 16 },
};

export type ThemeColors = typeof lightColors;

export function useTheme() {
  const scheme = useColorScheme();
  const colors = scheme === "dark" ? darkColors : lightColors;
  return { colors, spacing, radius, typography, scheme: scheme ?? "light" };
}
