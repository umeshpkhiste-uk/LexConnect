import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { CenterFabTabBar } from "@/shared/ui/CenterFabTabBar";
import { useTheme } from "@/shared/ui/theme";

// Calendar stays a tab route (so /calendar?date=… links and the Home screen's
// calendar shortcuts keep working) but isn't shown in the bar, leaving two
// tabs either side of the centre "+" button.
const HIDDEN_TABS = ["calendar"];

export default function TabsLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.background } }}
      // React Navigation calls tabBar as a plain function, so it must return
      // an element — not be a component itself (hooks inside it would break).
      tabBar={(props) => (
        <CenterFabTabBar
          {...props}
          hiddenRoutes={HIDDEN_TABS}
          pinnedRoutes={["index"]}
          centerLabel="Add new client"
          onCenterPress={() => router.push("/(app)/clients/new")}
        />
      )}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: "Cases",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "briefcase" : "briefcase-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: "Calendar",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="network"
        options={{
          title: "Network",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "people" : "people-outline"} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
