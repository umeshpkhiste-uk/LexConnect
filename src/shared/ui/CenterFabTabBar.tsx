import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "expo-router/tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./theme";

type Props = BottomTabBarProps & {
  /** Route names that exist as tabs but aren't shown in the bar. */
  hiddenRoutes?: string[];
  onCenterPress: () => void;
  centerLabel: string;
};

/**
 * Bottom bar with a raised round action button in the middle: the visible
 * tabs are split evenly either side of it. Always visible, fixed to the
 * bottom of the screen.
 */
export function CenterFabTabBar({ state, descriptors, navigation, hiddenRoutes = [], onCenterPress, centerLabel }: Props) {
  const { colors, typography } = useTheme();
  const insets = useSafeAreaInsets();

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
