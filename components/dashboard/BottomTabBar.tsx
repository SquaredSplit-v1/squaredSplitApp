import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Svg, { Circle, Path, Rect } from "react-native-svg";

export type TabName = "home" | "groups" | "ai_assist" | "activity" | "account";

interface BottomTabBarProps {
  activeTab: TabName;
  onTabPress: (tab: TabName) => void;
  bottomInset: number;
}

const akAvatar = require("../../assets/dashboard/ak.png");

// Simple inline SVG icons
function HomeIcon({ active }: { active: boolean }) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"
        fill={active ? "#141414" : "none"}
        stroke={active ? "#141414" : "#6B6B6B"}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function GroupsIcon({ active }: { active: boolean }) {
  const color = active ? "#141414" : "#6B6B6B";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Circle cx={9} cy={7} r={3} stroke={color} strokeWidth={1.8} />
      <Circle cx={17} cy={8} r={2.5} stroke={color} strokeWidth={1.8} />
      <Path
        d="M2 20c0-3.3 2.7-6 6-6h2c3.3 0 6 2.7 6 6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M17 14c2.2 0 4 1.8 4 4v2"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function AiAssistIcon({ active }: { active: boolean }) {
  const color = active ? "#141414" : "#6B6B6B";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={active ? "#141414" : "none"}
      />
      <Path
        d="M18 14l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z"
        stroke={color}
        strokeWidth={1.2}
        strokeLinejoin="round"
        fill={active ? "#141414" : "none"}
      />
    </Svg>
  );
}

function ActivityIcon({ active }: { active: boolean }) {
  const color = active ? "#141414" : "#6B6B6B";
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={3}
        width={18}
        height={14}
        rx={3}
        stroke={color}
        strokeWidth={1.8}
      />
      <Path
        d="M7 9h10M7 13h6"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
      <Path
        d="M8 17l-2 4M16 17l2 4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

const TABS: {
  name: TabName;
  label: string;
  Icon?: React.FC<{ active: boolean }>;
}[] = [
  { name: "home", label: "Home", Icon: HomeIcon },
  { name: "groups", label: "Groups", Icon: GroupsIcon },
  { name: "ai_assist", label: "AI assist", Icon: AiAssistIcon },
  { name: "activity", label: "Activity", Icon: ActivityIcon },
  { name: "account", label: "Account" },
];

export default function BottomTabBar({
  activeTab,
  onTabPress,
  bottomInset,
}: BottomTabBarProps) {
  return (
    <View style={[styles.outerContainer, { paddingBottom: bottomInset + 8 }]}>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.name;
          const isAccount = tab.name === "account";
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tabItem}
              onPress={() => onTabPress(tab.name)}
            >
              {/* Active indicator line */}
              {isActive && <View style={styles.activeIndicator} />}

              {isAccount ? (
                <View
                  style={[
                    styles.accountAvatar,
                    isActive && styles.accountAvatarActive,
                  ]}
                >
                  <Image source={akAvatar} style={styles.accountImage} />
                </View>
              ) : tab.Icon ? (
                <tab.Icon active={isActive} />
              ) : null}
              <Text
                style={[styles.tabLabel, isActive && styles.tabLabelActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#EADFEA",
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    position: "relative",
  },
  activeIndicator: {
    position: "absolute",
    bottom: -8,
    width: 24,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#141414",
  },
  accountAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: "hidden",
  },
  accountAvatarActive: {
    borderWidth: 2,
    borderColor: "#141414",
  },
  accountImage: {
    width: "100%",
    height: "100%",
    borderRadius: 14,
  },
  tabLabel: {
    fontFamily: "Nunito_400Regular",
    fontSize: 10,
    fontWeight: "400",
    color: "#6B6B6B",
    marginTop: 4,
  },
  tabLabelActive: {
    color: "#141414",
    fontFamily: "Nunito_600SemiBold",
    fontWeight: "600",
  },
});
