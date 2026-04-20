import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Redirect, Tabs } from 'expo-router'
import React from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { useAuthStore } from '@/store/authStore'

const akAvatar = require('../../assets/dashboard/ak.png')

/* ─── Tab icons (Figma) ─────────────────────────────────── */

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? '#141414' : '#6B6B6B'
  return (
    <Svg width={24} height={24} viewBox="0 0 20 20" fill="none">
      <Path
        d="M11.4966 3.44664C10.678 2.60112 9.32192 2.60112 8.50323 3.44663L4.50451 7.57641C4.27485 7.81359 4.12053 8.11343 4.06098 8.43816C3.57535 11.0865 3.5395 13.7977 3.95495 16.4579L4.10204 17.3997C4.14849 17.6972 4.40471 17.9165 4.7058 17.9165H7.49993C7.73005 17.9165 7.9166 17.73 7.9166 17.4999V11.6665H12.0833V17.4999C12.0833 17.73 12.2698 17.9165 12.4999 17.9165H15.294C15.5951 17.9165 15.8513 17.6972 15.8978 17.3997L16.0449 16.4579C16.4603 13.7977 16.4245 11.0865 15.9388 8.43816C15.8793 8.11343 15.725 7.81359 15.4953 7.57641L11.4966 3.44664Z"
        fill={c}
      />
    </Svg>
  )
}
function GroupsIcon({ active }: { active: boolean }) {
  const c = active ? '#141414' : '#6B6B6B'
  return (
    <Svg width={24} height={24} viewBox="0 0 20 20" fill="none">
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.45841 6.24967C6.45841 4.29367 8.04407 2.70801 10.0001 2.70801C11.9561 2.70801 13.5417 4.29367 13.5417 6.24967C13.5417 8.20568 11.9561 9.79134 10.0001 9.79134C8.04407 9.79134 6.45841 8.20568 6.45841 6.24967ZM10.0001 3.95801C8.73443 3.95801 7.70842 4.98402 7.70842 6.24967C7.70842 7.51533 8.73443 8.54134 10.0001 8.54134C11.2657 8.54134 12.2917 7.51533 12.2917 6.24967C12.2917 4.98402 11.2657 3.95801 10.0001 3.95801Z"
        fill={c}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M6.66675 12.2913C5.63121 12.2913 4.79175 13.1308 4.79175 14.1663V15.1566C4.79175 15.1717 4.80268 15.1845 4.81756 15.1869C8.24985 15.7473 11.7503 15.7473 15.1826 15.1869C15.1975 15.1845 15.2084 15.1717 15.2084 15.1566V14.1663C15.2084 13.1308 14.3689 12.2913 13.3334 12.2913H13.0494C13.0274 12.2913 13.0056 12.2948 12.9847 12.3016L12.2634 12.5371C10.7927 13.0174 9.20742 13.0174 7.73673 12.5371L7.01547 12.3016C6.99459 12.2948 6.97277 12.2913 6.95081 12.2913H6.66675ZM3.54175 14.1663C3.54175 12.4405 4.94086 11.0413 6.66675 11.0413H6.95081C7.10455 11.0413 7.25733 11.0657 7.40348 11.1134L8.12474 11.3489C9.34331 11.7468 10.6569 11.7468 11.8754 11.3489L12.5967 11.1134C12.7428 11.0657 12.8956 11.0413 13.0494 11.0413H13.3334C15.0593 11.0413 16.4584 12.4405 16.4584 14.1663V15.1566C16.4584 15.7843 16.0035 16.3195 15.384 16.4206C11.8183 17.0028 8.18183 17.0028 4.61614 16.4206C3.99665 16.3195 3.54175 15.7843 3.54175 15.1566V14.1663Z"
        fill={c}
      />
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
    <Svg width={24} height={24} viewBox="0 0 20 20" fill="none">
      <Path
        d="M6.66659 7.91658C6.09129 7.91658 5.62492 8.38295 5.62492 8.95824C5.62492 9.53354 6.09129 9.99991 6.66659 9.99991C7.24188 9.99991 7.70825 9.53354 7.70825 8.95824C7.70825 8.38295 7.24188 7.91658 6.66659 7.91658Z"
        fill={c}
      />
      <Path
        d="M9.99992 7.91658C9.42462 7.91658 8.95825 8.38295 8.95825 8.95824C8.95825 9.53354 9.42462 9.99991 9.99992 9.99991C10.5752 9.99991 11.0416 9.53354 11.0416 8.95824C11.0416 8.38295 10.5752 7.91658 9.99992 7.91658Z"
        fill={c}
      />
      <Path
        d="M12.2916 8.95824C12.2916 8.38295 12.758 7.91658 13.3333 7.91658C13.9085 7.91658 14.3749 8.38295 14.3749 8.95824C14.3749 9.53354 13.9085 9.99991 13.3333 9.99991C12.758 9.99991 12.2916 9.53354 12.2916 8.95824Z"
        fill={c}
      />
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M13.4172 3.82724C11.172 3.63577 8.91514 3.62466 6.6682 3.79401L6.50718 3.80614C4.36442 3.96764 2.70825 5.75333 2.70825 7.90217V14.9999C2.70825 15.2198 2.82381 15.4235 3.01254 15.5364C3.20128 15.6492 3.43542 15.6545 3.62912 15.5504L6.88811 13.799C7.0397 13.7176 7.20912 13.6749 7.38122 13.6749H14.8616C15.805 13.6749 16.6135 13.0004 16.7826 12.0723C17.1253 10.1913 17.1524 8.26629 16.8627 6.37637L16.7773 5.81943C16.6219 4.80547 15.7924 4.02979 14.7703 3.94263L13.4172 3.82724ZM6.76215 5.04047C8.94244 4.87614 11.1324 4.88693 13.311 5.07271L14.6641 5.18811C15.111 5.22622 15.4738 5.56542 15.5417 6.00882L15.6271 6.56576C15.8958 8.3185 15.8707 10.1037 15.5528 11.8482C15.492 12.1822 15.201 12.4249 14.8616 12.4249H7.38122C7.0026 12.4249 6.62988 12.5187 6.29638 12.698L3.95825 13.9545V7.90217C3.95825 6.40725 5.11043 5.16496 6.60112 5.05261L6.76215 5.04047Z"
        fill={c}
      />
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
  const session = useAuthStore(s => s.session)
  const isLoading = useAuthStore(s => s.isLoading)

  if (isLoading) return null
  if (!session) return <Redirect href="/(auth)/login" />

  return (
    <Tabs tabBar={props => <CustomTabBar {...props} />} screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI Assist' }} />
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
