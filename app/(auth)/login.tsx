import { BoxIcon, TickIcon } from "@/components/svg";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

const logoUri = Asset.fromModule(require("../../assets/app-icon.svg")).uri;
const loginBgUri = Asset.fromModule(
  require("../../assets/auth/Blur-Ellipse.svg"),
).uri;

const MARQUEE_ITEM_WIDTH = 88;
const MARQUEE_GAP = 20;
const MARQUEE_TOTAL_WIDTH = (MARQUEE_ITEM_WIDTH + MARQUEE_GAP) * 4; // 4 items

// Gradient blob for login page background with blur
function LoginGradientBlob() {
  return (
    <View style={styles.gradientBlobContainer}>
      <SvgUri width="100%" height="100%" uri={loginBgUri} />
    </View>
  );
}

// Small version of the logo for login screen
function SmallLogo() {
  return (
    <View style={{ width: 140, height: 100 }}>
      <SvgUri width="100%" height="100%" uri={logoUri} />
    </View>
  );
}

// Marquee component
function Marquee() {
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
    <View style={styles.marqueeContainer}>
      <Animated.View style={[styles.marqueeContent, animatedStyle]}>
        {items.map((item, index) => (
          <View key={index} style={styles.marqueeItem}>
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

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [countryCode, setCountryCode] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const phoneInputRef = useRef<TextInput>(null);

  const handleCountryCodeChange = (text: string) => {
    // Only allow digits, max 3
    const cleaned = text.replace(/\D/g, "").substring(0, 3);
    setCountryCode(cleaned);
    // Auto-focus phone input when country code is filled
    if (cleaned.length === 3) {
      phoneInputRef.current?.focus();
    }
  };

  const formatPhoneNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, "").substring(0, 12);
    let formatted = "";
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 3);
    }
    if (cleaned.length > 3) {
      formatted += " " + cleaned.substring(3, 6);
    }
    if (cleaned.length > 6) {
      formatted += " " + cleaned.substring(6, 12);
    }
    return formatted;
  };

  const handlePhoneChange = (text: string) => {
    setPhoneNumber(formatPhoneNumber(text));
  };

  const getFullPhoneNumber = () => {
    const code = countryCode || "1";
    const phone = phoneNumber.replace(/\s/g, "");
    return `+${code} ${formatPhoneNumber(phone)}`;
  };

  const handleGetStarted = () => {
    const fullNumber = getFullPhoneNumber();
    console.log("Phone number:", fullNumber);
    router.push({
      pathname: "/(auth)/otp",
      params: { phoneNumber: fullNumber },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Blurred gradient blob */}
      <LoginGradientBlob />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <SmallLogo />
        </View>

        {/* Tagline */}
        <Text style={styles.tagline}>
          Track your expenses and{"\n"}settle up with ease
        </Text>

        {/* Marquee */}
        <Marquee />

        {/* Input section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Enter your mobile number to continue
          </Text>
          <View style={styles.phoneInputRow}>
            <View style={styles.countryCodeContainer}>
              <Text style={styles.plusSign}>+</Text>
              <TextInput
                style={styles.countryCodeInput}
                placeholder="1"
                placeholderTextColor="#9CA3AF"
                value={countryCode}
                onChangeText={handleCountryCodeChange}
                keyboardType="number-pad"
                maxLength={3}
              />
            </View>
            <TextInput
              ref={phoneInputRef}
              style={styles.phoneInput}
              placeholder="XXX XXX XXXX"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={14}
            />
          </View>
        </View>

        {/* Get Started Button */}
        <TouchableOpacity style={styles.button} onPress={handleGetStarted}>
          <Text style={styles.buttonText}>Get Started</Text>
        </TouchableOpacity>

        {/* Footer links */}
        <View style={styles.footerLinks}>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Privacy policy</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={styles.footerLink}>Terms of service</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F5",
  },
  gradientBlobContainer: {
    position: "absolute",
    top: -80,
    left: "50%",
    marginLeft: -320,
    width: 680,
    height: 680,
    borderRadius: 500,
    overflow: "hidden",
  },
  blurContainer: {
    width: 700,
    height: 700,
    borderRadius: 500,
    overflow: "hidden",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: "flex-start",
    marginBottom: 8,
  },
  tagline: {
    fontSize: 24,
    fontWeight: "300",
    color: "#6B6B6B",
    lineHeight: 32,
    letterSpacing: -0.48,
    paddingBottom: 90,
    marginBottom: 48,
  },
  marqueeContainer: {
    height: 100,
    overflow: "hidden",
    marginBottom: 56,
    marginHorizontal: -24,
  },
  marqueeContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  marqueeItem: {
    width: MARQUEE_ITEM_WIDTH,
    height: MARQUEE_ITEM_WIDTH,
    marginRight: MARQUEE_GAP,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#9CA3AF",
    lineHeight: 21,
    marginBottom: 8,
  },
  phoneInputRow: {
    flexDirection: "row",
  },
  countryCodeContainer: {
    width: 72,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    borderRightWidth: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  plusSign: {
    fontSize: 16,
    color: "#141414",
  },
  countryCodeInput: {
    flex: 1,
    height: 52,
    fontSize: 16,
    color: "#141414",
    paddingHorizontal: 2,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: "#141414",
    backgroundColor: "#FFFFFF",
  },
  button: {
    height: 52,
    backgroundColor: "#141414",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  footerLinks: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 8,
    paddingTop: 50,
  },
  footerLink: {
    fontSize: 14,
    fontWeight: "400",
    color: "#6B6B6B",
    lineHeight: 16.8,
    letterSpacing: -0.28,
  },
});
