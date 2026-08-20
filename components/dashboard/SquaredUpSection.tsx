import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Path } from 'react-native-svg'

interface SquaredUpSectionProps {
  onPress: () => void
  expanded?: boolean
}

function DownArrowIcon() {
  return (
    <View style={styles.arrowContainer}>
      <Svg width={20} height={20} viewBox="0 0 20 20" fill="none">
        <Path
          d="M10 4v12M10 16l-4-4M10 16l4-4"
          stroke="#141414"
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  )
}

export default function SquaredUpSection({ onPress, expanded }: SquaredUpSectionProps) {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.textContainer}>
        <Text style={styles.title}>Show squared-up friends</Text>
        <Text style={styles.subtitle}>Hiding friends you squared with over 7 days ago</Text>
      </View>
      <View style={expanded ? styles.arrowExpanded : undefined}>
        <DownArrowIcon />
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#141414',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 30,
    letterSpacing: -0.4,
  },
  subtitle: {
    color: '#9CA3AF',
    fontFamily: 'Nunito_400Regular',
    fontSize: 14,
    fontWeight: '400',
    lineHeight: 14,
    letterSpacing: -0.28,
    marginTop: 4,
  },
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D1D5DB',
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  arrowExpanded: {
    transform: [{ rotate: '180deg' }],
  },
})
