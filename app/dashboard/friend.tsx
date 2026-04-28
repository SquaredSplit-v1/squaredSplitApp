import { Asset } from "expo-asset";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SvgUri } from "react-native-svg";

import { AddExpenseButton, BottomTabBar } from "@/components/dashboard";

const trainIconUri = Asset.fromModule(
  require("../../assets/expense-screen/train.svg"),
).uri;
const settingsIconUri = Asset.fromModule(
  require("../../assets/settings.svg"),
).uri;
const likeIconUri = Asset.fromModule(require("../../assets/like.svg")).uri;
const calendarIconUri = Asset.fromModule(
  require("../../assets/calendar.svg"),
).uri;
const profileImageOneUri = Asset.fromModule(
  require("../../assets/onboarding/1.png"),
).uri;
const profileImageTwoUri = Asset.fromModule(
  require("../../assets/onboarding/2.png"),
).uri;

const FRIEND_SUMMARIES: Record<string, { name: string; subtitle: string }> = {
  "1": { name: "AJ", subtitle: "Due on 1 Jan" },
  "2": { name: "Praneeth Reddy Ramesh", subtitle: "Alert!" },
  "3": { name: "AJ", subtitle: "Due on 1 Jan" },
  "4": { name: "Sarah Paul", subtitle: "Upcoming due" },
  "5": { name: "Seshwath Hegde", subtitle: "8 Dec'25" },
};

export default function FriendSummaryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ friendId?: string }>();
  const [activePanel, setActivePanel] = React.useState<
    "square-up" | "board" | "charts"
  >("square-up");

  const summary = useMemo(() => {
    const friendId = Array.isArray(params.friendId)
      ? params.friendId[0]
      : params.friendId;
    return friendId ? FRIEND_SUMMARIES[friendId] : undefined;
  }, [params.friendId]);

  if (!summary) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateTitle}>Friend not found</Text>
        <TouchableOpacity style={styles.actionButton} onPress={() => router.back()}>
          <Text style={styles.actionButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.summaryScrollContent}>
        <View style={styles.summaryTopBar}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.backText}>{"< Back"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingsButton}>
            <SvgUri width={21} height={21} uri={settingsIconUri} />
          </TouchableOpacity>
        </View>

        <View style={styles.summaryHeader}>
          <View style={styles.profileStack}>
            <View style={[styles.profileAvatarRing, styles.profileAvatarBack]}>
              <Image source={{ uri: profileImageOneUri }} style={styles.profileAvatar} />
            </View>
            <View style={[styles.profileAvatarRing, styles.profileAvatarFront]}>
              <Image source={{ uri: profileImageTwoUri }} style={styles.profileAvatar} />
            </View>
          </View>
          <Text style={styles.summaryTitle}>{summary.name}</Text>
          <View style={styles.summaryDivider} />
        </View>

        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[
              styles.chip,
              activePanel === "square-up" && styles.chipSelected,
            ]}
            onPress={() => setActivePanel("square-up")}
            activeOpacity={0.85}
          >
            <SvgUri width={12} height={14} uri={likeIconUri} />
            <Text
              style={[
                styles.chipText,
                activePanel === "square-up" && styles.chipTextSelected,
              ]}
            >
              Square up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              activePanel === "board" && styles.chipSelected,
            ]}
            onPress={() => setActivePanel("board")}
            activeOpacity={0.85}
          >
            <SvgUri width={15} height={15} uri={calendarIconUri} />
            <Text
              style={[
                styles.chipText,
                activePanel === "board" && styles.chipTextSelected,
              ]}
            >
              Whiteboard
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chip,
              activePanel === "charts" && styles.chipSelected,
            ]}
            onPress={() => setActivePanel("charts")}
            activeOpacity={0.85}
          >
            <SvgUri width={15} height={15} uri={calendarIconUri} />
            <Text
              style={[
                styles.chipText,
                activePanel === "charts" && styles.chipTextSelected,
              ]}
            >
              Charts
            </Text>
          </TouchableOpacity>
        </View>

        {activePanel === "square-up" ? (
          <View style={styles.boardCard}>
            <Text style={styles.sectionTitle}>Square up</Text>
            <Text style={styles.sectionSubtitle}>
              This is the default view for this friend.
            </Text>

            <TouchableOpacity
              style={styles.expenseRow}
              onPress={() => router.push("/dashboard/expense/taxi" as never)}
              activeOpacity={0.85}
            >
              <View style={styles.expenseRowLeft}>
                <View style={styles.expenseIconBadge}>
                  <SvgUri width="100%" height="100%" uri={trainIconUri} />
                </View>
                <View>
                  <Text style={styles.expenseRowTitle}>Taxi</Text>
                  <Text style={styles.expenseRowSubtitle}>You paid $9.24</Text>
                  <Text style={styles.expenseRowMeta}>{summary.subtitle}</Text>
                </View>
              </View>
              <View style={styles.expenseRowRight}>
                <Text style={styles.expenseRowDueLabel}>owes you</Text>
                <Text style={styles.expenseRowDueAmount}>$9.24</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : activePanel === "board" ? (
          <View style={styles.boardCard}>
            <Text style={styles.sectionTitle}>Whiteboard</Text>
            <Text style={styles.sectionSubtitle}>
              Tap an expense to open the detail screen.
            </Text>

            <TouchableOpacity
              style={styles.expenseRow}
              onPress={() => router.push("/dashboard/expense/taxi" as never)}
              activeOpacity={0.85}
            >
              <View style={styles.expenseRowLeft}>
                <View style={styles.expenseIconBadge}>
                  <SvgUri width="100%" height="100%" uri={trainIconUri} />
                </View>
                <View>
                  <Text style={styles.expenseRowTitle}>Taxi</Text>
                  <Text style={styles.expenseRowSubtitle}>You paid $9.24</Text>
                  <Text style={styles.expenseRowMeta}>{summary.subtitle}</Text>
                </View>
              </View>
              <View style={styles.expenseRowRight}>
                <Text style={styles.expenseRowDueLabel}>owes you</Text>
                <Text style={styles.expenseRowDueAmount}>$9.24</Text>
              </View>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.boardCard}>
            <Text style={styles.sectionTitle}>Charts</Text>
            <Text style={styles.sectionSubtitle}>
              A quick snapshot of what this friend owes.
            </Text>

            <View style={styles.chartRow}>
              <Text style={styles.chartLabel}>Taxi</Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { width: "42%" }]} />
              </View>
              <Text style={styles.chartAmount}>$9.24</Text>
            </View>

            <View style={styles.chartRow}>
              <Text style={styles.chartLabel}>Whiteboard</Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { width: "68%" }]} />
              </View>
              <Text style={styles.chartAmount}>$14.80</Text>
            </View>

            <View style={styles.chartRow}>
              <Text style={styles.chartLabel}>Charts</Text>
              <View style={styles.chartBarTrack}>
                <View style={[styles.chartBarFill, { width: "30%" }]} />
              </View>
              <Text style={styles.chartAmount}>$6.20</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <AddExpenseButton onPress={() => {}} />
      <BottomTabBar activeTab="home" onTabPress={() => {}} bottomInset={0} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  summaryScrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 18,
  },
  summaryTopBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  backText: {
    color: "#3B82F6",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
  },
  settingsButton: {
    padding: 4,
  },
  summaryHeader: {
    marginBottom: 10,
  },
  profileStack: {
    width: 78,
    height: 56,
    marginBottom: 6,
  },
  profileAvatarRing: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
  },
  profileAvatarBack: {
    left: 0,
    top: 2,
  },
  profileAvatarFront: {
    left: 24,
    top: 14,
  },
  profileAvatar: {
    width: "100%",
    height: "100%",
  },
  summaryTitle: {
    color: "#141414",
    fontFamily: "Nunito_700Bold",
    fontSize: 28,
    lineHeight: 32,
    marginTop: 10,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "#ECE7D8",
    marginTop: 12,
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
    paddingBottom: 4,
  },
  chip: {
    borderWidth: 1,
    borderColor: "#C9D0DD",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chipSelected: {
    backgroundColor: "#E6EDBC",
    borderColor: "#D2DCA0",
  },
  chipText: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
  },
  boardCard: {
    marginTop: 4,
    borderRadius: 16,
    backgroundColor: "#FAFAFC",
    borderWidth: 1,
    borderColor: "#ECEFF5",
    padding: 14,
  },
  sectionTitle: {
    color: "#141414",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
  },
  sectionSubtitle: {
    color: "#6B7280",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    marginTop: 4,
    marginBottom: 10,
  },
  expenseRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F2F4",
  },
  expenseRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 10,
  },
  expenseIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F9F0BF",
    overflow: "hidden",
    padding: 6,
  },
  expenseRowTitle: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 16,
  },
  expenseRowSubtitle: {
    color: "#72777F",
    fontFamily: "Nunito_400Regular",
    fontSize: 13,
    marginTop: 1,
  },
  expenseRowMeta: {
    color: "#9CA3AF",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
    marginTop: 2,
  },
  expenseRowRight: {
    alignItems: "flex-end",
    marginLeft: 12,
  },
  expenseRowDueLabel: {
    color: "#9CA3AF",
    fontFamily: "Nunito_400Regular",
    fontSize: 12,
  },
  expenseRowDueAmount: {
    color: "#44BB73",
    fontFamily: "Nunito_700Bold",
    fontSize: 16,
    marginTop: 2,
  },
  chartRow: {
    gap: 8,
    marginTop: 12,
  },
  chartLabel: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 13,
  },
  chartBarTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "#E5E7EB",
    overflow: "hidden",
  },
  chartBarFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: "#44BB73",
  },
  chartAmount: {
    color: "#374151",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "#FFFFFF",
  },
  emptyStateTitle: {
    color: "#141414",
    fontFamily: "Nunito_700Bold",
    fontSize: 22,
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: "#141414",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  actionButtonText: {
    color: "#FFFFFF",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 14,
  },
});