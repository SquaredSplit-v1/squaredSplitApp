import { SquaredSplitLogo } from "@/components/svg/squared-split-logo";
import { useAuthStore } from "@/stores/authStore";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function HomeScreen() {
  const signOut = useAuthStore((s) => s.signOut);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const handleSignOut = async () => {
    opacity.value = withTiming(0.5, { duration: 200 });
    await signOut();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <SquaredSplitLogo />
        </View>

        <Text style={styles.welcomeText}>Welcome to SquaredSplit</Text>
        <Text style={styles.subText}>Dashboard coming soon</Text>
      </View>

      <View style={styles.buttonContainer}>
        <AnimatedPressable
          onPress={handleSignOut}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={[styles.signOutButton, animatedStyle]}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </AnimatedPressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F5",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  logoContainer: {
    marginBottom: 32,
    transform: [{ scale: 0.8 }],
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#141414",
    marginBottom: 8,
    textAlign: "center",
  },
  subText: {
    fontSize: 16,
    color: "#6B6B6B",
    textAlign: "center",
  },
  buttonContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  signOutButton: {
    backgroundColor: "#141414",
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  signOutText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
