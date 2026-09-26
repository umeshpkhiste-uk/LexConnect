import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/tabs";
import { useEffect, useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./theme";

type Props = BottomTabBarProps & {
  /** Route names that exist as tabs but aren't shown in the bar. */
  hiddenRoutes?: string[];
  onCenterPress: () => void;
  centerLabel: string;
  /** Tabs where the bar always stays visible (others auto-hide). */
  pinnedRoutes?: string[];
  /** How long the bar stays up on other tabs before sliding away. */
  autoHideMs?: number;
};

/**
 * Bottom bar with a raised round action button in the middle: the visible
 * tabs are split evenly either side of it. On pinned tabs (Home) it always
 * shows; elsewhere it slides away after a few seconds, leaving a small handle
 * that brings it back.
 */
export function CenterFabTabBar({
  state,
  descriptors,
  navigation,
  hiddenRoutes = [],
  onCenterPress,
  centerLabel,
  pinnedRoutes = [],
  autoHideMs = 5000,
}: Props) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const current = state.routes[state.index];
  const isPinned = pinnedRoutes.includes(current.name);
  // Which tab visit the bar was hidden on; a new visit or a reveal shows it again.
  const [hiddenFor, setHiddenFor] = useState<string | null>(null);
  const [revealCount, setRevealCount] = useState(0);
  // Every switch to a tab counts as a new visit (the bar shows again).
  const [lastIndex, setLastIndex] = useState(state.index);
  if (lastIndex !== state.index) {
    setLastIndex(state.index);
    setRevealCount((n) => n + 1);
  }
  const visitKey = `${current.key}:${revealCount}`;
  const isHidden = !isPinned && hiddenFor === visitKey;

  useEffect(() => {
    if (isPinned) return;
    const timer = setTimeout(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setHiddenFor(visitKey);
    }, autoHideMs);
    return () => clearTimeout(timer);
  }, [visitKey, isPinned, autoHideMs]);

  const reveal = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setRevealCount((n) => n + 1);
  };

  if (isHidden) {
    return (
      <Pressable
        onPress={reveal}
        accessibilityRole="button"
        accessibilityLabel="Show navigation bar"
        style={[styles.handleArea, { paddingBottom: Math.max(insets.bottom - 8, 6) }]}
      >
        <View style={[styles.handle, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="chevron-up" size={18} color={colors.brand} />
        </View>
      </Pressable>
    );
  }

  const visible = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => !hiddenRoutes.includes(route.name));
  const half = Math.ceil(visible.length / 2);

  const renderTab = ({ route, index }: (typeof visible)[number]) => {
    const { options } = descriptors[route.key];
    const focused = state.index === index;
    const color = focused ? colors.brand : colors.textSecondary;
    const label = typeof options.title === "string" ? options.title : route.name;

    const onPress = () => {
      const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
      if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
    };

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        onLongPress={() => navigation.emit({ type: "tabLongPress", target: route.key })}
        accessibilityRole="tab"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        style={styles.tab}
      >
        {options.tabBarIcon?.({ focused, color, size: 24 })}
        <Text style={[typography.caption, { color, fontSize: 12, fontWeight: focused ? "600" : "400", marginTop: 2 }]}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 10) },
      ]}
    >
      <View style={styles.side}>{visible.slice(0, half).map(renderTab)}</View>

      <View style={styles.centerSlot}>
        <Pressable
          onPress={onCenterPress}
          accessibilityRole="button"
          accessibilityLabel={centerLabel}
          style={({ pressed }) => [
            styles.fab,
            {
              backgroundColor: colors.brand,
              borderColor: colors.background,
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Ionicons name="add" size={32} color={colors.textInverse} />
        </Pressable>
      </View>

      <View style={styles.side}>{visible.slice(half).map(renderTab)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 10,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: 0,
    shadowColor: "#0F172A",
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: -4 },
    elevation: 12,
  },
  side: { flex: 1, flexDirection: "row" },
  handleArea: { alignItems: "center", paddingTop: 4 },
  handle: {
    width: 64,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#0F172A",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
    elevation: 6,
  },
  tab: { flex: 1, alignItems: "center", justifyContent: "center", minHeight: 48 },
  centerSlot: { width: 84, alignItems: "center" },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginTop: -34,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#0F172A",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
