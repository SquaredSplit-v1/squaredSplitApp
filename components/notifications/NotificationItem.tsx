import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  FadeIn,
  LinearTransition,
  SlideOutRight,
} from "react-native-reanimated";
import type { NotificationRequest } from "./types";

interface NotificationItemProps {
  item: NotificationRequest;
  onAccept: (item: NotificationRequest) => void;
  onReject: (item: NotificationRequest) => void;
}

export default function NotificationItem({
  item,
  onAccept,
  onReject,
}: NotificationItemProps) {
  const isOwed = item.type === "owed";

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={SlideOutRight.duration(400)}
      layout={LinearTransition.duration(300)}
      style={styles.container}
    >
      {/* Avatar */}
      <Image source={item.avatar} style={styles.avatar} />

      {/* Content */}
      <View style={styles.content}>
        {/* Time */}
        <Text style={styles.timeText}>{item.timeAgo}</Text>

        {/* Message */}
        <Text style={styles.messageText}>
          <Text style={styles.boldName}>{item.userName}</Text>
          <Text style={styles.regularText}> has added an expense of </Text>
          <Text style={styles.amountText}>${item.amount}</Text>
          <Text style={styles.owedText}> ({isOwed ? "owed" : "you owe"})</Text>
          <Text style={styles.regularText}> in the group </Text>
          <Text style={styles.boldName}>{item.groupName}</Text>
        </Text>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.acceptButton}
            onPress={() => onAccept(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={22} color="#2E7D32" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.rejectButton}
            onPress={() => onReject(item)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#C62828" />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: "flex-start",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    marginTop: 14,
  },
  content: {
    flex: 1,
  },
  timeText: {
    color: "#9CA3AF",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 4,
  },
  messageText: {
    flexDirection: "row",
    flexWrap: "wrap",
    lineHeight: 17.6,
  },
  boldName: {
    color: "#141414",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 17.6,
  },
  regularText: {
    color: "#6B6B6B",
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 17.6,
  },
  amountText: {
    color: "#44BB73",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 17.6,
  },
  owedText: {
    color: "#6B6B6B",
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    fontStyle: "italic",
    fontWeight: "400",
    lineHeight: 17.6,
  },
  actions: {
    flexDirection: "row",
    marginTop: 10,
    gap: 10,
  },
  acceptButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#CDF5DC",
    alignItems: "center",
    justifyContent: "center",
  },
  rejectButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FFCECE",
    alignItems: "center",
    justifyContent: "center",
  },
});
