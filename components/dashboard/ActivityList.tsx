import React from 'react'
import { StyleSheet, Text, View } from 'react-native'

import ActivityItem, { Activity } from './ActivityItem'

interface ActivityListProps {
  activities: Activity[]
}

export default function ActivityList({ activities }: ActivityListProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recent activities</Text>
      <View style={styles.list}>
        {activities.map(item => (
          <ActivityItem key={item.id} item={item} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    color: '#141414',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26.4,
    letterSpacing: -0.44,
    marginBottom: 8,
  },
  list: {
    paddingBottom: 120,
  },
})
