import React from 'react'
import { StyleSheet, View } from 'react-native'

import FriendItem from './FriendItem'
import type { Friend } from './types'

interface FriendsListProps {
  friends: Friend[]
}

export default function FriendsList({ friends }: FriendsListProps) {
  return (
    <View style={styles.list}>
      {friends.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 ? <View style={styles.separator} /> : null}
          <FriendItem friend={item} />
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
