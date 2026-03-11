import React from 'react'
import { View } from 'react-native'

import AppIcon from '../../assets/app-icon.svg'

export function SmallLogo() {
  return (
    <View style={{ width: 140, height: 100 }}>
      <AppIcon width="100%" height="100%" />
    </View>
  )
}
