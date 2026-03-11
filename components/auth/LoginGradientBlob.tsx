import React from 'react'
import { StyleSheet, View } from 'react-native'

import BlurEllipse from '../../assets/auth/Blur-Ellipse.svg'

/**
 * Blurred gradient ellipse positioned behind the login screen content.
 */
export function LoginGradientBlob() {
  return (
    <View style={styles.container}>
      <BlurEllipse width="100%" height="100%" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: -80,
    left: '50%',
    marginLeft: -320,
    width: 680,
    height: 680,
    borderRadius: 500,
    overflow: 'hidden',
  },
})
