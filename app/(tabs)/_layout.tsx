import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { Redirect, Tabs, useFocusEffect } from 'expo-router'
import React, { useCallback, useState } from 'react'
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'

import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/store/authStore'

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

function AiIcon({ active }: { active: boolean }) {
  const c = active ? '#141414' : '#6B6B6B'
  return (
    <Svg width={24} height={24} viewBox="0 0 20 20" fill="none">
      {/* Squarer — 4-point sparkle */}
      <Path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M10 1.875C10.2526 1.875 10.4694 2.06151 10.5108 2.31092L10.9056 4.68846C11.0226 5.39047 11.5715 5.93942 12.2736 6.05644L14.6511 6.45124C14.9005 6.49262 15.087 6.70944 15.087 6.96203C15.087 7.21462 14.9005 7.43144 14.6511 7.47282L12.2736 7.86762C11.5715 7.98464 11.0226 8.53359 10.9056 9.2356L10.5108 11.6131C10.4694 11.8626 10.2526 12.049 10 12.049C9.74742 12.049 9.5306 11.8626 9.48922 11.6131L9.09442 9.2356C8.9774 8.53359 8.42845 7.98464 7.72644 7.86762L5.3489 7.47282C5.09949 7.43144 4.91298 7.21462 4.91298 6.96203C4.91298 6.70944 5.09949 6.49262 5.3489 6.45124L7.72644 6.05644C8.42845 5.93942 8.9774 5.39047 9.09442 4.68846L9.48922 2.31092C9.5306 2.06151 9.74742 1.875 10 1.875Z"
        fill={c}
      />
      <Path
        d="M14.635 11.7188C14.7919 11.7188 14.9264 11.8346 14.9521 11.9896L15.106 12.9217C15.1667 13.2866 15.4524 13.5723 15.8173 13.633L16.7494 13.7869C16.9044 13.8126 17.0202 13.9471 17.0202 14.104C17.0202 14.2609 16.9044 14.3954 16.7494 14.4211L15.8173 14.575C15.4524 14.6357 15.1667 14.9214 15.106 15.2863L14.9521 16.2184C14.9264 16.3734 14.7919 16.4892 14.635 16.4892C14.4781 16.4892 14.3436 16.3734 14.3179 16.2184L14.164 15.2863C14.1033 14.9214 13.8176 14.6357 13.4527 14.575L12.5206 14.4211C12.3656 14.3954 12.2498 14.2609 12.2498 14.104C12.2498 13.9471 12.3656 13.8126 12.5206 13.7869L13.4527 13.633C13.8176 13.5723 14.1033 13.2866 14.164 12.9217L14.3179 11.9896C14.3436 11.8346 14.4781 11.7188 14.635 11.7188Z"
        fill={c}
      />
      <Path
        d="M5.73902 12.5762C5.89592 12.5762 6.03042 12.692 6.05611 12.847L6.14846 13.4033C6.18412 13.6169 6.35093 13.7837 6.56452 13.8194L7.12086 13.9117C7.27586 13.9374 7.39161 14.0719 7.39161 14.2288C7.39161 14.3857 7.27586 14.5202 7.12086 14.5459L6.56452 14.6383C6.35093 14.6739 6.18412 14.8407 6.14846 15.0543L6.05611 15.6107C6.03042 15.7657 5.89592 15.8814 5.73902 15.8814C5.58213 15.8814 5.44763 15.7657 5.42194 15.6107L5.32959 15.0543C5.29393 14.8407 5.12712 14.6739 4.91353 14.6383L4.35719 14.5459C4.20219 14.5202 4.08644 14.3857 4.08644 14.2288C4.08644 14.0719 4.20219 13.9374 4.35719 13.9117L4.91353 13.8194C5.12712 13.7837 5.29393 13.6169 5.32959 13.4033L5.42194 12.847C5.44763 12.692 5.58213 12.5762 5.73902 12.5762Z"
        fill={c}
      />
    </Svg>
  )
}

const ICONS: Record<string, React.FC<{ active: boolean }>> = {
  index: HomeIcon,
  groups: GroupsIcon,
  activity: ActivityIcon,
  ai: AiIcon,
}

/* ─── Custom floating tab bar ───────────────────────────── */

const HIDDEN_TAB_NAMES = new Set<string>()

/** Account tab avatar — the signed-in user's profile picture. */
function AccountTabAvatar({ active }: { active: boolean }) {
  const userId = useAuthStore(s => s.user?.id)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [initial, setInitial] = useState('?')

  const load = useCallback(async () => {
    if (!userId) return
    const { data } = await supabase
      .from('profiles')
      .select('avatar_url, full_name')
      .eq('id', userId)
      .single()
    if (!data) return
    setAvatarUrl((data as { avatar_url?: string | null }).avatar_url ?? null)
    setInitial(
      (((data as { full_name?: string | null }).full_name ?? '?').trim()[0] ?? '?').toUpperCase()
    )
  }, [userId])

  useFocusEffect(
    useCallback(() => {
      void load()
    }, [load])
  )

  return (
    <View style={[styles.avatar, active && styles.avatarActive]}>
      {avatarUrl ? (
        <Image source={{ uri: avatarUrl }} style={styles.avatarImg} />
      ) : (
        <Text style={styles.avatarFallback}>{initial}</Text>
      )}
    </View>
  )
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets()

  const visibleRoutes = state.routes.filter(route => !HIDDEN_TAB_NAMES.has(route.name))

  return (
    <View style={[styles.outer, { paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.bar}>
        {visibleRoutes.map(route => {
          const index = state.routes.findIndex(r => r.key === route.key)
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
                <AccountTabAvatar active={isActive} />
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
      <Tabs.Screen name="ai" options={{ title: 'Squarer' }} />
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
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarActive: { borderWidth: 2, borderColor: '#141414' },
  avatarImg: { width: '100%', height: '100%', borderRadius: 14 },
  avatarFallback: { fontSize: 13, fontWeight: '600', color: '#6B6B6B' },
  label: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: '#6B6B6B', marginTop: 4 },
  labelActive: { color: '#141414', fontFamily: 'Nunito_600SemiBold', fontWeight: '600' },
})
