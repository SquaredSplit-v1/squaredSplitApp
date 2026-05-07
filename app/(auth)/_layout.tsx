import { Stack } from 'expo-router'

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="index" options={{ animation: 'none' }} />
      <Stack.Screen name="login" options={{ animation: 'none' }} />
      <Stack.Screen name="verify-otp" />
    </Stack>
  )
}
