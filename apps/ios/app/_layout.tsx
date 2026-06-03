import { Tabs } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { View } from "react-native"
import { COLORS, SHADOWS } from "../theme"

function TabIcon({ focused }: { focused: boolean }) {
  return (
    <View
      style={{
        width: focused ? 22 : 8,
        height: 8,
        borderRadius: 999,
        backgroundColor: focused ? COLORS.primary : COLORS.surfaceHover,
      }}
    />
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
            title: "推荐",
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rankings"
          options={{
            title: "发现",
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="me"
          options={{
            title: "我的",
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
          }}
        />
        <Tabs.Screen name="company/[id]" options={{ href: null }} />
        <Tabs.Screen name="company/[id]/reviews" options={{ href: null }} />
        <Tabs.Screen name="company/[id]/reviews/[reviewId]" options={{ href: null }} />
        <Tabs.Screen name="company/[id]/ratings" options={{ href: null }} />
        <Tabs.Screen name="review/[id]" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
        <Tabs.Screen name="submit" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="register" options={{ href: null }} />
        <Tabs.Screen name="salaries" options={{ href: null }} />
        <Tabs.Screen name="interviews" options={{ href: null }} />
        <Tabs.Screen name="jobs" options={{ href: null }} />
        <Tabs.Screen name="benefits" options={{ href: null }} />
        <Tabs.Screen name="community" options={{ href: null }} />
      </Tabs>
    </>
  )
}
