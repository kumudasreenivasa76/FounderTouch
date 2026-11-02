import { Platform } from "react-native";
import { Tabs } from "expo-router/tabs";
import { Icon } from "@/components";
import { colors, fonts } from "@/theme";

const TABS = [
  { name: "index", title: "Share", icon: "qr" },
  { name: "scan", title: "Scan", icon: "scan" },
  { name: "contacts", title: "Contacts", icon: "users" },
  { name: "events", title: "Events", icon: "calendar" },
  { name: "profile", title: "Profile", icon: "user" },
] as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.ink3,
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11, letterSpacing: 0.1 },
        tabBarStyle: {
          backgroundColor: Platform.OS === "web" ? "rgba(255,255,255,0.96)" : colors.surface,
          borderTopColor: colors.line,
        },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.title,
            tabBarIcon: ({ color, focused }) => <Icon n={t.icon} size={22} color={String(color)} strokeWidth={focused ? 2.1 : 1.75} />,
          }}
        />
      ))}
    </Tabs>
  );
}
