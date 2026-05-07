import React from 'react'
import { Image, ImageSourcePropType, StyleSheet, Text, View } from 'react-native'

export interface ActivitySegment {
  text: string
  bold?: boolean
}

export interface Activity {
  id: string
  avatar: ImageSourcePropType
  segments: ActivitySegment[]
  timeAgo: string
}

interface ActivityItemProps {
  item: Activity
}

export default function ActivityItem({ item }: ActivityItemProps) {
  return (
    <View style={styles.container}>
      <Image source={item.avatar} style={styles.avatar} />
      <View style={styles.content}>
        <Text style={styles.message}>
          {item.segments.map((seg, i) =>
            seg.bold ? (
              <Text key={i} style={styles.bold}>
                {seg.text}
              </Text>
            ) : (
              <Text key={i} style={styles.regular}>
                {seg.text}
              </Text>
            )
          )}
        </Text>
        <Text style={styles.timeText}>{item.timeAgo}</Text>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    flexWrap: 'wrap',
  },
  bold: {
    color: '#141414',
    fontFamily: 'Nunito_700Bold',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 17.6,
  },
  regular: {
    color: '#6B6B6B',
    fontFamily: 'Nunito_400Regular',
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 17.6,
  },
  timeText: {
    color: '#9CA3AF',
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
})
