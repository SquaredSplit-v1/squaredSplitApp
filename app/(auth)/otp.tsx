import { Asset } from "expo-asset";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
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
    withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

const loginBgUri = Asset.fromModule(
  require("../../assets/auth/Blur-Ellipse.svg"),
).uri;

const OTP_LENGTH = 6;

function LoginGradientBlob() {
  return (
    <View style={styles.gradientBlobContainer}>
      <SvgUri width="100%" height="100%" uri={loginBgUri} />
    </View>
  );
}

export default function OtpScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { phoneNumber } = useLocalSearchParams<{ phoneNumber: string }>();

  const [otp, setOtp] = useState<string[]>(Array(OTP_LENGTH).fill(""));
  const inputRefs = useRef<(TextInput | null)[]>([]);

  // Submit button fill animation
  const fillProgress = useSharedValue(0);
  const allFilled = otp.every((digit) => digit !== "");

  useEffect(() => {
    fillProgress.value = withTiming(allFilled ? 1 : 0, {
      duration: 500,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [allFilled, fillProgress]);

  const fillAnimatedStyle = useAnimatedStyle(() => ({
    width: `${fillProgress.value * 100}%`,
  }));

  const submitTextStyle = useAnimatedStyle(() => ({
    color:
      fillProgress.value > 0.5 ? "rgba(255,255,255,1)" : "rgba(107,107,107,1)",
  }));

  const handleOtpChange = (text: string, index: number) => {
    // Only allow single digit
    const digit = text.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Auto-focus next input
    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleSendAgain = () => {
    // TODO: Resend OTP
    console.log("Resending OTP to", phoneNumber);
  };

  const handleSubmit = () => {
    if (!allFilled) return;
    const code = otp.join("");
    console.log("OTP submitted:", code);
    // TODO: Verify OTP and navigate
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Same blurred gradient blob background as login */}
      <LoginGradientBlob />

      <View
        style={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 20 },
        ]}
      >
        {/* Back button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>{"‹ Back"}</Text>
        </TouchableOpacity>

        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.headerText}>
            Please enter the verification code sent to your phone number
          </Text>
          <Text style={styles.phoneText}>{phoneNumber}</Text>
        </View>

        {/* OTP Input */}
        <View style={styles.otpSection}>
          <Text style={styles.otpLabel}>Verification code</Text>
          <View style={styles.otpRow}>
            {Array.from({ length: OTP_LENGTH }).map((_, index) => (
              <TextInput
                key={index}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                style={[
                  styles.otpInput,
                  otp[index] ? styles.otpInputFilled : null,
                ]}
                value={otp[index]}
                onChangeText={(text) => handleOtpChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                keyboardType="number-pad"
                maxLength={1}
                selectTextOnFocus
              />
            ))}
          </View>
        </View>

        {/* Send again */}
        <TouchableOpacity
          style={styles.sendAgainButton}
          onPress={handleSendAgain}
        >
          <Text style={styles.sendAgainIcon}>↻</Text>
          <Text style={styles.sendAgainText}>Send again</Text>
        </TouchableOpacity>

        {/* Spacer */}
        <View style={{ flex: 1 }} />

        {/* Submit button with fill animation */}
        <TouchableOpacity
          style={styles.submitButton}
          onPress={handleSubmit}
          activeOpacity={0.8}
        >
          {/* Background fill layer */}
          <Animated.View style={[styles.submitFill, fillAnimatedStyle]} />
          <Animated.Text style={[styles.submitText, submitTextStyle]}>
            SUBMIT
          </Animated.Text>
        </TouchableOpacity>
      </View>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  backButton: {
    marginBottom: 24,
    alignSelf: "flex-start",
  },
  backText: {
    fontSize: 17,
    color: "#141414",
    fontWeight: "400",
  },
  headerSection: {
    marginBottom: 32,
  },
  headerText: {
    color: "#141414",
    fontSize: 24,
    fontWeight: "400",
    lineHeight: 24,
    letterSpacing: -0.48,
    marginBottom: 12,
  },
  phoneText: {
    color: "#AF84AF",
    fontSize: 16,
    fontWeight: "500",
    lineHeight: 24,
  },
  otpSection: {
    marginBottom: 16,
  },
  otpLabel: {
    fontSize: 14,
    fontWeight: "400",
    color: "#9CA3AF",
    lineHeight: 21,
    marginBottom: 12,
  },
  otpRow: {
    flexDirection: "row",
    gap: 10,
  },
  otpInput: {
    width: 48,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    textAlign: "center",
    fontSize: 20,
    fontWeight: "600",
    color: "#141414",
  },
  otpInputFilled: {
    borderColor: "#6793D1",
  },
  sendAgainButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  sendAgainIcon: {
    fontSize: 16,
    color: "#141414",
  },
  sendAgainText: {
    fontSize: 14,
    fontWeight: "400",
    color: "#141414",
  },
  submitButton: {
    height: 52,
    borderRadius: 8,
    backgroundColor: "#E5E7EB",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
  },
  submitFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "#6793D1",
    borderRadius: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
    zIndex: 1,
  },
});
