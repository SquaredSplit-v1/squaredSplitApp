import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function NotificationHeader() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={20} color="#3273CD" />
        <Text style={styles.backText}>Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Incoming requests</Text>
      <View style={styles.placeholder} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backText: {
    color: "#3273CD",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
    textAlign: "center",
  },
  title: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 19.2,
    letterSpacing: -0.32,
    flex: 2,
    textAlign: "center",
  },
  placeholder: {
    flex: 1,
  },
});
