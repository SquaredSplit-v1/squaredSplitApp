import { useAuthStore } from "@/stores/authStore";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Onboarding images
const onboardingImages = [
  require("../../assets/onboarding/1.png"),
  require("../../assets/onboarding/2.png"),
  require("../../assets/onboarding/3.png"),
  require("../../assets/onboarding/4.png"),
  require("../../assets/onboarding/5.png"),
  require("../../assets/onboarding/6.png"),
  require("../../assets/onboarding/7.png"),
  require("../../assets/onboarding/8.png"),
  require("../../assets/onboarding/9.png"),
];

// Floating image positions (mimicking the screenshot layout - shifted right)
const IMAGE_POSITIONS = [
  // Row 1 - top area
  { top: 0.02, left: 0.75, size: 72, rotation: "8deg" },
  { top: 0.04, left: 0.05, size: 64, rotation: "-6deg" },
  // Row 2 - center area
  { top: 0.14, left: 0.35, size: 90, rotation: "3deg" },
  // Row 3
  { top: 0.24, left: 0.05, size: 80, rotation: "-4deg" },
  { top: 0.22, left: 0.78, size: 95, rotation: "6deg" },
  // Row 4
  { top: 0.36, left: 0.22, size: 65, rotation: "-8deg" },
  { top: 0.35, left: 0.62, size: 60, rotation: "5deg" },
  // Row 5 - bottom
  { top: 0.44, left: 0.72, size: 85, rotation: "-3deg" },
  { top: 0.46, left: 0.05, size: 70, rotation: "7deg" },
];

const pages = [
  {
    title: "Keep track of balances\nbetween friends",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
  },
  {
    title: "Split expenses\nwith groups",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
  },
  {
    title: "Settle debts\nseamlessly",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor",
  },
];

function FloatingImages() {
  return (
    <View style={styles.imagesContainer}>
      {onboardingImages.map((img, index) => {
        const pos = IMAGE_POSITIONS[index];
        return (
          <View
            key={index}
            style={[
              styles.floatingImage,
              {
                top: pos.top * SCREEN_HEIGHT,
                left: pos.left * SCREEN_WIDTH,
                width: pos.size,
                height: pos.size,
                transform: [{ rotate: pos.rotation }],
              },
            ]}
          >
            <Image source={img} style={styles.image} resizeMode="cover" />
          </View>
        );
      })}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const completeOnboarding = useAuthStore((s) => s.completeOnboarding);
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveIndex(index);
  };

  const handleSkip = async () => {
    // Mark onboarding as complete so the user isn't shown it again
    await completeOnboarding();
    // Navigate to main dashboard
    router.replace("/dashboard/dashboard");
  };

  const isLastPage = activeIndex === pages.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#F5F3E4", "#D4D2C3", "#8AA3C7"]}
        locations={[0.0337, 0.3798, 1]}
        style={styles.gradient}
      >
        {/* Welcome header */}
        <View style={[styles.headerContainer, { paddingTop: insets.top + 16 }]}>
          <Text style={styles.welcomeLight}>Welcome to</Text>
          <Text style={styles.welcomeBold}>SquaredSplit</Text>
        </View>

        {/* Floating images */}
        <FloatingImages />

        {/* Bottom content card */}
        <View
          style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}
        >
          {/* Swipeable text */}
          <FlatList
            ref={flatListRef}
            data={pages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            keyExtractor={(_, i) => i.toString()}
            renderItem={({ item }) => (
              <View style={styles.pageContent}>
                <Text style={styles.pageTitle}>{item.title}</Text>
                <Text style={styles.pageDescription}>{item.description}</Text>
              </View>
            )}
          />

          {/* Skip tour / Done button */}
          <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
            <Text style={styles.skipText}>
              {isLastPage ? "Done" : "Skip tour"}
            </Text>
          </TouchableOpacity>

          {/* Pagination dots */}
          <View style={styles.paginationContainer}>
            {pages.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  activeIndex === index ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
    borderRadius: 32,
  },
  headerContainer: {
    alignItems: "center",
    zIndex: 10,
  },
  welcomeLight: {
    fontSize: 28,
    fontWeight: "300",
    color: "#000",
    textAlign: "center",
  },
  welcomeBold: {
    fontSize: 32,
    fontWeight: "700",
    color: "#000",
    textAlign: "center",
    marginTop: -2,
  },
  imagesContainer: {
    flex: 1,
    position: "relative",
  },
  floatingImage: {
    position: "absolute",
    borderRadius: 16,
    overflow: "hidden",
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 16,
  },
  bottomSection: {
    paddingHorizontal: 24,
    alignItems: "center",
  },
  pageContent: {
    width: SCREEN_WIDTH - 48,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  pageTitle: {
    color: "#000",
    textAlign: "center",
    fontSize: 26,
    fontWeight: "400",
    lineHeight: 26,
    letterSpacing: -0.52,
    marginBottom: 12,
  },
  pageDescription: {
    color: "rgba(39, 39, 39, 0.80)",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "400",
    lineHeight: 19.2,
    letterSpacing: -0.32,
    paddingHorizontal: 16,
  },
  skipButton: {
    width: Math.min(353, SCREEN_WIDTH - 40),
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#F2F2F2",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  skipText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#141414",
  },
  paginationContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#141414",
  },
  dotInactive: {
    backgroundColor: "rgba(20, 20, 20, 0.25)",
  },
});
