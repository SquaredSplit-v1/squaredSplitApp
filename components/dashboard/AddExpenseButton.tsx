import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface AddExpenseButtonProps {
  onPress: () => void;
}

export default function AddExpenseButton({ onPress }: AddExpenseButtonProps) {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.text}>+ Add expense</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "flex-end",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  button: {
    backgroundColor: "#141414",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    // box-shadow: 0 4px 4px 0 rgba(0,0,0,0.04)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 4,
  },
  text: {
    color: "#FFFFFF",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 14,
  },
});
