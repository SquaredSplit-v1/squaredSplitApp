import React from "react";
import { FlatList, StyleSheet, View } from "react-native";
import FriendItem from "./FriendItem";
import type { Friend } from "./types";

interface FriendsListProps {
  friends: Friend[];
  onFriendPress?: () => void;
}

export default function FriendsList({ friends, onFriendPress }: FriendsListProps) {
  return (
    <FlatList
      data={friends}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => <FriendItem friend={item} onPress={onFriendPress} />}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      showsVerticalScrollIndicator={false}
      style={styles.list}
      contentContainerStyle={styles.listContent}
    />
  );
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
    backgroundColor: "#F3F4F5",
    marginLeft: 56,
  },
});
