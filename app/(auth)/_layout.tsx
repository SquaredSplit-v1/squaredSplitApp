import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "fade",
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="authloading" />
      <Stack.Screen name="phone" />
      <Stack.Screen name="verify-otp" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}
