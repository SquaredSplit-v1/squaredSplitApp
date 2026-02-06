import { Asset } from "expo-asset";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

// Nav icons
const walletUri = Asset.fromModule(
  require("../../assets/dashboard/Nav/wallet.svg"),
).uri;
const searchUri = Asset.fromModule(
  require("../../assets/dashboard/Nav/search.svg"),
).uri;
const addFriendUri = Asset.fromModule(
  require("../../assets/dashboard/Nav/add-friend.svg"),
).uri;

// Tab icons
const friendsUri = Asset.fromModule(
  require("../../assets/dashboard/friends.svg"),
).uri;
const groupsUri = Asset.fromModule(
  require("../../assets/dashboard/groups.svg"),
).uri;
const qrUri = Asset.fromModule(require("../../assets/dashboard/qr.svg")).uri;
const activityUri = Asset.fromModule(
  require("../../assets/dashboard/activity.svg"),
).uri;

// Add expense button
const addExpenseUri = Asset.fromModule(
  require("../../assets/dashboard/add-expense-button.svg"),
).uri;

type TabName = "friends" | "groups" | "qr" | "activity" | "account";

const tabs: { name: TabName; label: string; icon?: string }[] = [
  { name: "friends", label: "Friends", icon: friendsUri },
  { name: "groups", label: "Groups", icon: groupsUri },
  { name: "qr", label: "", icon: qrUri },
  { name: "activity", label: "Activity", icon: activityUri },
  { name: "account", label: "Account" },
];

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>("friends");

  const handleCreateGroup = () => {
    // TODO: Navigate to create group
    console.log("Create a new group");
  };

  const handleAddExpense = () => {
    // TODO: Navigate to add expense
    console.log("Add expense");
  };

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#FFFFFF", "#E8E1EC", "#C5C9D8"]}
        locations={[0, 0.65, 1]}
        style={styles.backgroundGradient}
      />

      {/* Main content */}
      <View style={[styles.content, { paddingTop: insets.top + 8 }]}>
        {/* Navigation bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.navIcon}>
            <SvgUri width={28} height={28} uri={walletUri} />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.navIcon}>
              <SvgUri width={24} height={24} uri={searchUri} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIcon}>
              <SvgUri width={24} height={24} uri={addFriendUri} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.welcomeHi}>Hi!</Text>
          <Text style={styles.welcomeText}>
            Welcome to your{"\n"}dashboard.
          </Text>
          <TouchableOpacity onPress={handleCreateGroup}>
            <Text style={styles.createGroupText}>+ Create a new group</Text>
          </TouchableOpacity>
        </View>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Add expense button */}
        <View style={styles.addExpenseContainer}>
          <TouchableOpacity onPress={handleAddExpense}>
            <SvgUri width={70} height={70} uri={addExpenseUri} />
          </TouchableOpacity>
          <Text style={styles.addExpenseText}>Add Expense</Text>
        </View>
      </View>

      {/* Bottom tab bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.name;
          const isQR = tab.name === "qr";

          return (
            <TouchableOpacity
              key={tab.name}
              style={[styles.tabItem, isQR && styles.qrTabItem]}
              onPress={() => setActiveTab(tab.name)}
            >
              {isQR ? (
                <View>
                  <SvgUri width={42} height={42} uri={tab.icon!} />
                </View>
              ) : tab.name === "account" ? (
                <View
                  style={[
                    styles.accountIcon,
                    isActive && styles.accountIconActive,
                  ]}
                >
                  {/* Using a placeholder image for account */}
                  <View style={styles.accountImageContainer}>
                    <Text style={styles.accountPlaceholder}>👤</Text>
                  </View>
                </View>
              ) : (
                <View style={styles.tabIcon}>
                  <SvgUri width={24} height={24} uri={tab.icon!} />
                </View>
              )}
              {tab.label ? (
                <Text
                  style={[styles.tabLabel, isActive && styles.tabLabelActive]}
                >
                  {tab.label}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backgroundGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  navBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  navIcon: {
    padding: 8,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  welcomeSection: {
    marginTop: 24,
  },
  welcomeHi: {
    color: "#141414",
    fontSize: 36,
    fontWeight: "400",
    lineHeight: 36,
    letterSpacing: -0.72,
  },
  welcomeText: {
    color: "#141414",
    fontSize: 36,
    fontWeight: "400",
    lineHeight: 36,
    letterSpacing: -0.72,
    marginTop: 4,
  },
  createGroupText: {
    color: "#A479A4",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
    marginTop: 16,
  },
  addExpenseContainer: {
    alignItems: "flex-end",
    marginBottom: 16,
    paddingRight: 8,
  },
  addExpenseText: {
    color: "#141414",
    textAlign: "center",
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 10,
    marginTop: 0,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderTopWidth: 0,
    paddingTop: 8,
    paddingHorizontal: 8,
    // Shadow on top
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
  },
  qrTabItem: {
    marginTop: -1,
  },
  tabIcon: {
    width: 28,
    height: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  qrButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "#8EAED9",
    justifyContent: "center",
    alignItems: "center",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  accountIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
  },
  accountIconActive: {
    borderWidth: 2,
    borderColor: "#141414",
  },
  accountImageContainer: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 14,
  },
  accountPlaceholder: {
    fontSize: 16,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "400",
    color: "#9CA3AF",
    marginTop: 4,
  },
  tabLabelActive: {
    color: "#141414",
    fontWeight: "500",
  },
});
