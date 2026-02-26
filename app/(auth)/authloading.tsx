import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import LottieView from "lottie-react-native";
import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

SplashScreen.preventAutoHideAsync();

const splashAnimation = require("../../assets/animations/splash.json");

export default function AuthLoadingScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const lottieRef = useRef<LottieView>(null);
  const [lottieReady, setLottieReady] = useState(false);

  const onLottieLayout = useCallback(async () => {
    if (!lottieReady) {
      setLottieReady(true);
      await SplashScreen.hideAsync();
    }
  }, [lottieReady]);

  const onAnimationFinish = useCallback(
    (isCancelled: boolean) => {
      if (isCancelled) return;

      if (isLoading) return;

      if (user) {
        router.replace("/dashboard/dashboard");
      } else {
        router.replace("/(auth)/login");
      }
    },
    [isLoading, user, router],
  );

  return (
    <View style={styles.container}>
      <LottieView
        ref={lottieRef}
        source={splashAnimation}
        autoPlay
        loop={false}
        onLayout={onLottieLayout}
        onAnimationFinish={onAnimationFinish}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
});
