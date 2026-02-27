import { useAuth } from "@/contexts/AuthContext";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import Svg, {
  Circle,
  Defs,
  FeBlend,
  FeFlood,
  FeGaussianBlur,
  Filter,
  Stop,
  LinearGradient as SvgLinearGradient,
  SvgUri,
} from "react-native-svg";

// SVG assets — initial has "l", app has "/"
const initialLogoUri = Asset.fromModule(
  require("../../assets/initial-app-icon.svg"),
).uri;
const appLogoUri = Asset.fromModule(require("../../assets/app-icon.svg")).uri;

// Blob constants matching Figma: 580x580, blur=48.1
const BLOB_SIZE = 580;
const BLOB_BLUR_PADDING = 97; // ~2x stdDeviation
const BLOB_RENDER_SIZE = BLOB_SIZE + BLOB_BLUR_PADDING * 2;
const BLOB_START_TOP = -358; // initial position
const BLOB_END_TOP = -134; // final resting position
const BLOB_TRAVEL = BLOB_END_TOP - BLOB_START_TOP; // 224px
const BLOB_LEFT = -88;

// Gradient blob matching Figma spec
function GradientBlob() {
  return (
    <Svg
      width={BLOB_RENDER_SIZE}
      height={BLOB_RENDER_SIZE}
      viewBox={`${-BLOB_BLUR_PADDING} ${-BLOB_BLUR_PADDING} ${BLOB_RENDER_SIZE} ${BLOB_RENDER_SIZE}`}
      fill="none"
    >
      <Defs>
        <Filter
          id="blob_blur"
          x={String(-BLOB_BLUR_PADDING)}
          y={String(-BLOB_BLUR_PADDING)}
          width={String(BLOB_RENDER_SIZE)}
          height={String(BLOB_RENDER_SIZE)}
          filterUnits="userSpaceOnUse"
        >
          <FeFlood floodOpacity="0" result="BackgroundImageFix" />
          <FeBlend
            mode="normal"
            in="SourceGraphic"
            in2="BackgroundImageFix"
            result="shape"
          />
          <FeGaussianBlur stdDeviation="48.1" result="effect1_foregroundBlur" />
        </Filter>
        <SvgLinearGradient
          id="blob_grad"
          x1="290"
          y1="0"
          x2="290"
          y2="580"
          gradientUnits="userSpaceOnUse"
        >
          <Stop stopColor="#EADFEA" />
          <Stop offset="1" stopColor="#F6E7A6" />
        </SvgLinearGradient>
      </Defs>
      <Circle
        cx="290"
        cy="290"
        r="290"
        fill="url(#blob_grad)"
        filter="url(#blob_blur)"
      />
    </Svg>
  );
}

interface LogoProps {
  slashProgress: SharedValue<number>;
}

function AnimatedLogo({ slashProgress }: LogoProps) {
  // Crossfade: initial logo (with "l") fades out, final logo (with "/") fades in
  const initialOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(slashProgress.value, [0, 1], [1, 0]),
  }));

  const finalOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(slashProgress.value, [0, 1], [0, 1]),
  }));

  return (
    <View style={{ width: 247, height: 183 }}>
      {/* Initial logo with "l" — fades out */}
      <Animated.View style={[StyleSheet.absoluteFill, initialOpacity]}>
        <SvgUri width={247} height={183} uri={initialLogoUri} />
      </Animated.View>

      {/* Final logo with "/" — fades in */}
      <Animated.View style={[StyleSheet.absoluteFill, finalOpacity]}>
        <SvgUri width={247} height={183} uri={appLogoUri} />
      </Animated.View>
    </View>
  );
}

export default function AuthLoadingScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  // Animation values
  const blobTranslateY = useSharedValue(0);
  const slashProgress = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  const navigateToDestination = () => {
    if (user) {
      router.replace("/dashboard/dashboard");
    } else {
      router.replace("/(auth)/phone");
    }
  };

  useEffect(() => {
    if (isLoading) return;

    // Animation flow:
    // t=0ms    → Blob drops + L→/ morph simultaneously (1200ms)
    // t=1400ms → Fade out (400ms) then navigate

    // 1. Blob drops down 224px
    blobTranslateY.value = withTiming(BLOB_TRAVEL, {
      duration: 1200,
      easing: Easing.out(Easing.exp),
    });

    // 2. L→/ morph happens simultaneously with blob drop
    slashProgress.value = withTiming(1, {
      duration: 1200,
      easing: Easing.out(Easing.exp),
    });

    // 3. Fade out + navigate after both animations complete
    contentOpacity.value = withDelay(
      1400,
      withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(navigateToDestination)();
        }
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  const blobAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: blobTranslateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, containerAnimatedStyle]}>
      {/* Gradient blob — 580x580 circle with blur, animates from top=-358 to top=-134 */}
      <Animated.View style={[styles.blobContainer, blobAnimatedStyle]}>
        <GradientBlob />
      </Animated.View>

      {/* Logo */}
      <View style={styles.logoContainer}>
        <AnimatedLogo slashProgress={slashProgress} />
      </View>

      {/* Copyright */}
      <View style={styles.copyrightContainer}>
        <Text style={styles.copyrightText}>©SquaredSplit2026</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  blobContainer: {
    position: "absolute",
    width: BLOB_RENDER_SIZE,
    height: BLOB_RENDER_SIZE,
    top: BLOB_START_TOP - BLOB_BLUR_PADDING,
    left: BLOB_LEFT - BLOB_BLUR_PADDING,
  },
  logoContainer: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  copyrightContainer: {
    position: "absolute",
    bottom: 50,
  },
  copyrightText: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "400",
  },
});
