import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";

import type {
    FilterOption,
    Friend,
    Group,
    TabName,
} from "@/components/dashboard";
import {
    AddExpenseButton,
    BalanceSummary,
    BottomTabBar,
    FilterModal,
    FriendsList,
    GroupsList,
    SquaredUpSection,
} from "@/components/dashboard";

// Notification bell icon (replaces wallet)
function BellIcon() {
  return (
    <Svg width={28} height={28} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 8A6 6 0 106 8c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
        stroke="#141414"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

// Mock data — replace with real data from your backend later
const akAvatar = require("../../assets/dashboard/ak.png");
const coconutAvatar = require("../../assets/dashboard/coconut.png");

const MOCK_FRIENDS: Friend[] = [
  {
    id: "1",
    name: "AJ",
    avatar: akAvatar,
    subtitle: "Due on 1 Jan",
    subtitleType: "default",
    balanceType: "owes_you",
    amount: 10.0,
  },
  {
    id: "2",
    name: "Praneeth Reddy\nRamesh",
    avatar: null,
    subtitle: "Alert!",
    subtitleType: "alert",
    balanceType: "you_owe",
    amount: 2420.0,
  },
  {
    id: "3",
    name: "AJ",
    avatar: akAvatar,
    subtitle: "Due on 1 Jan",
    subtitleType: "default",
    balanceType: "owes_you",
    amount: 10.0,
  },
  {
    id: "4",
    name: "Sarah Paul",
    avatar: akAvatar,
    subtitle: "Upcoming due",
    subtitleType: "upcoming",
    balanceType: "owes_you",
    amount: 370.5,
  },
  {
    id: "5",
    name: "Seshwath Hegde",
    avatar: akAvatar,
    subtitle: "8 Dec'25",
    subtitleType: "default",
    balanceType: "owes_you",
    amount: 500.0,
  },
];

const MOCK_GROUPS: Group[] = [
  {
    id: "g1",
    name: "Goa 2026",
    avatar: coconutAvatar,
    emoji: "🌴",
    balanceType: "owes_you",
    amount: 10.0,
  },
  {
    id: "g2",
    name: "Beach House",
    avatar: coconutAvatar,
    balanceType: "you_owe",
    amount: 350.0,
  },
  {
    id: "g3",
    name: "Trip to Japan",
    avatar: coconutAvatar,
    balanceType: "you_owe",
    amount: 1485.0,
    members: [
      { name: "AJ", amount: 1485.0, balanceType: "owes_you" },
      { name: "Deep.R", amount: 1485.0, balanceType: "owes_you" },
      { name: "AJ", amount: 1485.0, balanceType: "owes_you" },
    ],
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabName>("home");
  const [filterVisible, setFilterVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterOption>("none");

  const handleAddExpense = () => {
    // TODO: Navigate to add expense
    console.log("Add expense");
  };

  const handleFilterSelect = (filter: FilterOption) => {
    setSelectedFilter(filter);
    setFilterVisible(false);
  };

  const handleShowSquaredUp = () => {
    // TODO: Toggle squared-up friends visibility
    console.log("Show squared-up friends");
  };

  const handleExpensePress = () => {
    router.push("/dashboard/expense/paid-for-car" as never);
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
            <BellIcon />
          </TouchableOpacity>
          <View style={styles.navRight}>
            <TouchableOpacity style={styles.navIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
                  stroke="#141414"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
            <TouchableOpacity style={styles.navIcon}>
              <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                <Path
                  d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M8.5 11a4 4 0 100-8 4 4 0 000 8zM20 8v6M23 11h-6"
                  stroke="#141414"
                  strokeWidth={1.8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </TouchableOpacity>
          </View>
        </View>

        {/* Balance summary */}
        <BalanceSummary
          balanceToSquare={20.0}
          youAreOwed={2575.0}
          youOwe={2575.0}
          onFilterPress={() => setFilterVisible(true)}
        />

        {/* Tab content */}
        {activeTab === "groups" ? (
          <GroupsList groups={MOCK_GROUPS} onGroupPress={handleExpensePress} />
        ) : (
          <FriendsList friends={MOCK_FRIENDS} onFriendPress={handleExpensePress} />
        )}

        {/* Show squared-up friends */}
        <SquaredUpSection onPress={handleShowSquaredUp} />
      </View>

      {/* Add expense floating button */}
      <AddExpenseButton onPress={handleAddExpense} />

      {/* Bottom tab bar */}
      <BottomTabBar
        activeTab={activeTab}
        onTabPress={setActiveTab}
        bottomInset={insets.bottom}
      />

      {/* Filter modal */}
      <FilterModal
        visible={filterVisible}
        selectedFilter={selectedFilter}
        onSelect={handleFilterSelect}
        onClose={() => setFilterVisible(false)}
      />
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
});
