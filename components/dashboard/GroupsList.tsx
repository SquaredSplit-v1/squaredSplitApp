import React from 'react'
import { StyleSheet, View } from 'react-native'

import GroupItem from './GroupItem'
import type { Group } from './types'

interface GroupsListProps {
  groups: Group[]
  onGroupPress?: (group: Group) => void
}

export default function GroupsList({ groups, onGroupPress }: GroupsListProps) {
  return (
    <View style={styles.list}>
      {groups.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <GroupItem group={item} onPress={onGroupPress ? () => onGroupPress(item) : undefined} />
        </React.Fragment>
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  list: {
    flexGrow: 0,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F5',
    marginLeft: 56,
  },
})
