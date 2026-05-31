import { Tabs } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { Text } from "react-native"
import { COLORS, SHADOWS } from "../theme"

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    "司南": "🧭",
    "榜单": "🏆",
    "我的": "👤",
  }
  return (
    <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.5 }}>
      {icons[label] ?? "●"}
    </Text>
  )
}

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.mutedLight,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopColor: COLORS.border,
            borderTopWidth: 1,
            height: 56,
            paddingBottom: 8,
            paddingTop: 4,
            ...SHADOWS.hero,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: "700",
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "司南",
            tabBarIcon: ({ focused }) => <TabIcon label="司南" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rankings"
          options={{
            title: "榜单",
            tabBarIcon: ({ focused }) => <TabIcon label="榜单" focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: "我的",
            tabBarIcon: ({ focused }) => <TabIcon label="我的" focused={focused} />,
          }}
        />
        <Tabs.Screen name="company/[id]" options={{ href: null }} />
        <Tabs.Screen name="review/[id]" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="submit" options={{ href: null }} />
      </Tabs>
    </>
  )
}
