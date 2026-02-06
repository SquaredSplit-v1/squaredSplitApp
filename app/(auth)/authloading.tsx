import { Asset } from "expo-asset";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SvgUri } from "react-native-svg";

const logoUri = Asset.fromModule(require("../../assets/app-icon.svg")).uri;
const loginBgUri = Asset.fromModule(
  require("../../assets/auth/BiggerEllipse.svg"),
).uri;

// Gradient blob background (same as login screen)
function LoginGradientBlob() {
  return (
    <View style={styles.gradientBlobContainer}>
      <SvgUri width="100%" height="100%" uri={loginBgUri} />
    </View>
  );
}

export default function AuthLoadingScreen() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/(auth)/login");
    }, 2000);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.container}>
      {/* Blurred gradient blob background */}
      <View className="absolute inset-0 -z-10 bg-[#EADFEA]" />
      <LoginGradientBlob />

      {/* Logo */}
      <View style={styles.logoContainer}>
        <SvgUri width="100%" height="100%" uri={logoUri} />
      </View>

      {/* Copyright */}
      <View style={styles.copyrightContainer}>
        <Text style={styles.copyrightText}>©SquaredSplit2026</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  gradientBlobContainer: {
    position: "absolute",
    top: -80,
    left: "50%",
    marginLeft: -320,
    width: 650,
    height: 650,
    borderRadius: 500,
    overflow: "hidden",
    opacity: 0.8,
  },
  logoContainer: {
    width: 247,
    height: 183,
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
