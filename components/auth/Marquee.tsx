import { BoxIcon, TickIcon } from "@/components/svg";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const MARQUEE_ITEM_WIDTH = 88;
const MARQUEE_GAP = 20;
const MARQUEE_TOTAL_WIDTH = (MARQUEE_ITEM_WIDTH + MARQUEE_GAP) * 4; // 4 items

export function Marquee() {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-MARQUEE_TOTAL_WIDTH, {
        duration: 8000,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const items = [
    { type: "box" },
    { type: "tick" },
    { type: "box" },
    { type: "tick" },
    { type: "box" },
    { type: "tick" },
    { type: "box" },
    { type: "tick" },
  ];

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.content, animatedStyle]}>
        {items.map((item, index) => (
          <View key={index} style={styles.item}>
            {item.type === "box" ? (
              <BoxIcon width={88} height={88} />
            ) : (
              <TickIcon width={88} height={88} />
            )}
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 100,
    overflow: "hidden",
    marginBottom: 56,
    marginHorizontal: -24,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  item: {
    width: MARQUEE_ITEM_WIDTH,
    height: MARQUEE_ITEM_WIDTH,
    marginRight: MARQUEE_GAP,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
