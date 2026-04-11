import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: '#FFFFFF' },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="authloading" />
      <Stack.Screen name="login" options={{ animation: 'none' }} />
      <Stack.Screen name="verify-otp" />
      {/* onboarding removed — it belongs to root stack, not (auth) */}
    </Stack>
  )
}
