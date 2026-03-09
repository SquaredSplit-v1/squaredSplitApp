import { Asset } from 'expo-asset'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SvgUri } from 'react-native-svg'

const loginBgUri = Asset.fromModule(require('../../assets/auth/Blur-Ellipse.svg')).uri

/**
 * Blurred gradient ellipse positioned behind the login screen content.
 */
export function LoginGradientBlob() {
  return (
    <View style={styles.container}>
      <SvgUri width="100%" height="100%" uri={loginBgUri} />
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
