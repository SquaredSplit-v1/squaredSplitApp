import React, { useEffect } from 'react'
import { StyleSheet, Text } from 'react-native'
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated'

import { TickIcon } from '@/components/svg/tick-icon'

interface SuccessToastProps {
  visible: boolean
  groupName: string
  onHide: () => void
}

export default function SuccessToast({ visible, groupName, onHide }: SuccessToastProps) {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onHide()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [visible, onHide])

  if (!visible) return null

  return (
    <Animated.View
      entering={FadeInDown.duration(400).springify().damping(18)}
      exiting={FadeOutDown.duration(300)}
      style={styles.container}
    >
      <TickIcon width={32} height={32} />
      <Text style={styles.text}>
        Your request has been sent to the group <Text style={styles.boldText}>{groupName}</Text>
      </Text>
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9EEBF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  text: {
    color: '#141414',
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 16,
    letterSpacing: -0.32,
    flex: 1,
  },
  boldText: {
    fontFamily: 'Nunito_700Bold',
    fontWeight: '700',
  },
})
