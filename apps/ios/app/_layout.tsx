import { useEffect } from "react"
import { router, Tabs, useSegments } from "expo-router"
import { StatusBar } from "expo-status-bar"
import { View } from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"
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
  const insets = useSafeAreaInsets()
  const segments = useSegments() as string[]
  const launchScopeOnly = process.env.EXPO_PUBLIC_LAUNCH_SCOPE_ONLY === "true"
  const topLevel = segments[0]
  const companyChild = topLevel === "company" ? segments[2] : undefined
  const deferredRoute = launchScopeOnly && (
    [
      "rankings",
      "salaries",
      "interviews",
      "jobs",
      "benefits",
      "community",
      "company-portal",
      "review",
    ].includes(topLevel ?? "") ||
    companyChild === "ratings" ||
    companyChild === "reviews"
  )

  useEffect(() => {
    if (deferredRoute) router.replace("/")
  }, [deferredRoute])

  if (deferredRoute) return null

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
            height: 56 + insets.bottom,
            paddingBottom: Math.max(8, insets.bottom),
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
          name="search"
          options={{
            title: "搜索",
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
          }}
        />
        <Tabs.Screen
          name="rankings"
          options={{ href: null }}
        />
        <Tabs.Screen
          name="research/index"
          options={{
            title: "研报",
            tabBarIcon: ({ focused }) => <TabIcon focused={focused} />,
          }}
        />
        <Tabs.Screen name="research/[slug]" options={{ href: null }} />
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
        <Tabs.Screen name="submit" options={{ href: null }} />
        <Tabs.Screen name="login" options={{ href: null }} />
        <Tabs.Screen name="register" options={{ href: null }} />
        <Tabs.Screen name="salaries" options={{ href: null }} />
        <Tabs.Screen name="interviews" options={{ href: null }} />
        <Tabs.Screen name="jobs" options={{ href: null }} />
        <Tabs.Screen name="benefits" options={{ href: null }} />
        <Tabs.Screen name="community" options={{ href: null }} />
        <Tabs.Screen name="company-portal/index" options={{ href: null }} />
        <Tabs.Screen name="company-portal/[companyId]" options={{ href: null }} />
      </Tabs>
    </>
  )
}
