import React from 'react'
import { FlatList, StyleSheet, View } from 'react-native'

import GroupItem from './GroupItem'
import type { Group } from './types'

interface GroupsListProps {
  groups: Group[]
  onGroupPress?: (group: Group) => void
}

export default function GroupsList({ groups, onGroupPress }: GroupsListProps) {
  return (
    <FlatList
      data={groups}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <GroupItem group={item} onPress={onGroupPress ? () => onGroupPress(item) : undefined} />
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  )
}

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 8,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F5',
    marginLeft: 56,
  },
})
