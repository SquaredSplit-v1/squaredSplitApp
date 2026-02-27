import { sendOtp } from "@/lib/auth";
import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import CountryPicker, {
  Country,
  CountryCode,
} from "react-native-country-picker-modal";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SvgUri } from "react-native-svg";

const logoUri = Asset.fromModule(require("../../assets/app-icon.svg")).uri;
const loginBgUri = Asset.fromModule(
  require("../../assets/auth/Blur-Ellipse.svg"),
).uri;

// ─── Gradient blob background ──────────────────────────────────────────────
function GradientBlob() {
  return (
    <View style={styles.gradientBlobContainer}>
      <SvgUri width="100%" height="100%" uri={loginBgUri} />
    </View>
  );
}

// ─── Small logo ────────────────────────────────────────────────────────────
function SmallLogo() {
  return (
    <View style={{ width: 140, height: 100 }}>
      <SvgUri width="100%" height="100%" uri={logoUri} />
    </View>
  );
}

// ─── Phone Entry Screen ────────────────────────────────────────────────────
export default function PhoneEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [countryCode, setCountryCode] = useState<CountryCode>("IN");
  const [callingCode, setCallingCode] = useState("91");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Strip non-digits to get raw number for validation
  const rawDigits = phoneNumber.replace(/\D/g, "");
  const isValidNumber = rawDigits.length === 10;

  // ── Country selection ──────────────────────────────────────────────────
  const onSelectCountry = useCallback((country: Country) => {
    setCountryCode(country.cca2);
    setCallingCode(country.callingCode[0] ?? "91");
    setIsPickerVisible(false);
  }, []);

  // ── Auto-format phone as user types (XXX XXX XXXX) ────────────────────
  const handlePhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, "").slice(0, 10);
    let formatted = "";
    if (cleaned.length > 0) formatted = cleaned.substring(0, 3);
    if (cleaned.length > 3) formatted += " " + cleaned.substring(3, 6);
    if (cleaned.length > 6) formatted += " " + cleaned.substring(6, 10);
    setPhoneNumber(formatted);
  };

  // ── Submit ─────────────────────────────────────────────────────────────
  const handleSendOtp = async () => {
    if (!isValidNumber) return;

    const fullPhone = `+${callingCode}${rawDigits}`;
    setIsLoading(true);

    try {
      const result = await sendOtp(fullPhone);

      if (!result.success) {
        const msg = result.retryAfter
          ? `Too many attempts. Try again in ${result.retryAfter}s.`
          : (result.error ?? "Failed to send verification code.");
        Alert.alert("Error", msg);
        return;
      }

      // Navigate to OTP screen, passing full E.164 phone
      router.push({
        pathname: "/(auth)/verify-otp",
        params: { phone: fullPhone },
      });
    } catch {
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      {/* Background blur blob */}
      <GradientBlob />

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

        {/* Input section */}
        <View style={styles.inputSection}>
          <Text style={styles.inputLabel}>
            Enter your mobile number to continue
          </Text>

          <View style={styles.phoneRow}>
            {/* Country code picker trigger */}
            <TouchableOpacity
              style={styles.countryPickerButton}
              onPress={() => setIsPickerVisible(true)}
              activeOpacity={0.7}
            >
              <CountryPicker
                countryCode={countryCode}
                withFilter
                withFlag
                withCallingCode
                withCallingCodeButton
                visible={isPickerVisible}
                onSelect={onSelectCountry}
                onClose={() => setIsPickerVisible(false)}
                containerButtonStyle={styles.countryPickerInner}
              />
              <Text style={styles.chevron}>▾</Text>
            </TouchableOpacity>

            {/* Phone number input */}
            <TextInput
              style={styles.phoneInput}
              placeholder="XXX XXX XXXX"
              placeholderTextColor="#9CA3AF"
              value={phoneNumber}
              onChangeText={handlePhoneChange}
              keyboardType="number-pad"
              maxLength={12} // 10 digits + 2 spaces
              autoFocus
            />
          </View>
        </View>

        {/* Send OTP button */}
        <TouchableOpacity
          style={[
            styles.button,
            (!isValidNumber || isLoading) && styles.buttonDisabled,
          ]}
          onPress={handleSendOtp}
          disabled={!isValidNumber || isLoading}
          activeOpacity={0.8}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
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

// ─── Styles ──────────────────────────────────────────────────────────────────

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    flexGrow: 1,
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
    marginBottom: 48,
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
  phoneRow: {
    flexDirection: "row",
    gap: 10,
  },
  countryPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
  },
  countryPickerInner: {
    flexDirection: "row",
    alignItems: "center",
  },
  chevron: {
    fontSize: 12,
    color: "#6B6B6B",
    marginLeft: 2,
  },
  phoneInput: {
    flex: 1,
    height: 52,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 8,
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
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
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
    marginTop: "auto",
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
