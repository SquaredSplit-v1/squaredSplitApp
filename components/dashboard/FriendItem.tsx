import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import type { Friend } from "./types";

interface FriendItemProps {
  friend: Friend;
}

export default function FriendItem({ friend }: FriendItemProps) {
  const isOwedToYou = friend.balanceType === "owes_you";

  const formatAmount = (amount: number) =>
    `$${amount.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const getSubtitleStyle = () => {
    switch (friend.subtitleType) {
      case "alert":
        return styles.subtitleAlert;
      case "upcoming":
        return styles.subtitleUpcoming;
      default:
        return styles.subtitle;
    }
  };

  const getSubtitlePrefix = () => {
    switch (friend.subtitleType) {
      case "alert":
        return "⚠ ";
      case "upcoming":
        return "⚠ ";
      default:
        return "";
    }
  };

  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {friend.avatar ? (
          <Image source={friend.avatar} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder]}>
            <Text style={styles.avatarInitial}>
              {friend.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name & subtitle */}
      <View style={styles.infoContainer}>
        <Text style={styles.name} numberOfLines={2}>
          {friend.name}
        </Text>
        <Text style={getSubtitleStyle()}>
          {getSubtitlePrefix()}
          {friend.subtitle}
        </Text>
      </View>

      {/* Amount */}
      <View style={styles.amountContainer}>
        <Text style={styles.owesLabel}>
          {isOwedToYou ? "owes you" : "you owe"}
        </Text>
        <Text
          style={[
            styles.amount,
            isOwedToYou ? styles.amountGreen : styles.amountOrange,
          ]}
        >
          {formatAmount(friend.amount)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  avatarPlaceholder: {
    backgroundColor: "#3273CD",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    color: "#FFFFFF",
    fontFamily: "Nunito_700Bold",
    fontSize: 18,
    fontWeight: "700",
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  name: {
    color: "#141414",
    fontFamily: "Nunito_400Regular",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 16,
  },
  subtitle: {
    color: "#9CA3AF",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 15,
    marginTop: 2,
  },
  subtitleAlert: {
    color: "#D48D4F",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 15,
    marginTop: 2,
  },
  subtitleUpcoming: {
    color: "#D48D4F",
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 15,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  owesLabel: {
    color: "#9CA3AF",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 18,
  },
  amount: {
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  amountGreen: {
    color: "#44BB73",
  },
  amountOrange: {
    color: "#D48D4F",
  },
});
