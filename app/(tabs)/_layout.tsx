import { useAuthStore } from '@/stores/authStore'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Redirect, Tabs } from 'expo-router'
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Circle, Path, Rect } from 'react-native-svg'

const akAvatar = require('../../assets/dashboard/ak.png')

/* ─── Tab icons (Figma) ─────────────────────────────────── */

function HomeIcon({ active }: { active: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"
        fill={active ? '#141414' : 'none'}
        stroke={active ? '#141414' : '#6B6B6B'}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

function GroupsIcon({ active }: { active: boolean }) {
  const c = active ? '#141414' : '#6B6B6B'
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={7} r={3} stroke={c} strokeWidth={1.8} />
      <Circle cx={17} cy={8} r={2.5} stroke={c} strokeWidth={1.8} />
      <Path
        d="M2 20c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6"
        stroke={c}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path d="M17 14c2.2 0 4 1.8 4 4v2" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

function AiSpaceIcon({ active }: { active: boolean }) {
  const c = active ? '#141414' : '#6B6B6B'
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
        stroke={c}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={active ? '#141414' : 'none'}
      />
      <Path
        d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"
        stroke={c}
        strokeWidth={1.2}
        strokeLinejoin="round"
        fill={active ? '#141414' : 'none'}
      />
    </Svg>
  )
}

function ActivityIcon({ active }: { active: boolean }) {
  const c = active ? '#141414' : '#6B6B6B'
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect x={3} y={3} width={18} height={14} rx={3} stroke={c} strokeWidth={1.8} />
      <Path d="M7 9h10M7 13h6" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 17l-2 4M16 17l2 4" stroke={c} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  )
}

const ICONS: Record<string, React.FC<{ active: boolean }>> = {
  index: HomeIcon,
  groups: GroupsIcon,
  ai: AiSpaceIcon,
  activity: ActivityIcon,
}

/* ─── Custom floating tab bar ───────────────────────────── */

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.bar}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key]
          const label = (options.tabBarLabel as string) ?? options.title ?? route.name
          const isActive = state.index === index
          const Icon = ICONS[route.name]

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            })
            if (!isActive && !event.defaultPrevented) navigation.navigate(route.name)
          }

          return (
            <TouchableOpacity
              key={route.key}
              style={styles.item}
              onPress={onPress}
              accessibilityRole="button"
              accessibilityState={isActive ? { selected: true } : {}}
              accessibilityLabel={label}
            >
              {isActive && <View style={styles.indicator} />}

              {route.name === 'account' ? (
                <View style={[styles.avatar, isActive && styles.avatarActive]}>
                  <Image source={akAvatar} style={styles.avatarImg} />
                </View>
              ) : Icon ? (
                <Icon active={isActive} />
              ) : null}

              <Text style={[styles.label, isActive && styles.labelActive]}>{label}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

/* ─── Layout with auth guard ────────────────────────────── */

export default function TabLayout() {
  const session = useAuthStore((s) => s.session)
  const isLoading = useAuthStore((s) => s.isLoading)

  if (isLoading) return null
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs tabBar={(props) => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI Space' }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity' }} />
      <Tabs.Screen name="account" options={{ title: 'Account' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  outer: { paddingHorizontal: 12, paddingTop: 8, backgroundColor: 'white' },
  bar: {
    flexDirection: 'row',
    backgroundColor: '#D4E7FF',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    bottom: -8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#141414',
  },
  avatar: { width: 28, height: 28, borderRadius: 14, overflow: 'hidden' },
  avatarActive: { borderWidth: 2, borderColor: '#141414' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 14 },
  label: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: '#6B6B6B', marginTop: 4 },
  labelActive: { color: '#141414', fontFamily: 'Nunito_600SemiBold', fontWeight: '600' },
})
