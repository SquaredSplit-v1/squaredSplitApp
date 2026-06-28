// This file is intentionally left as a redirect to the real dashboard.
// The legacy mock-data prototype has been removed.
import { Redirect } from 'expo-router'

export default function DashboardRedirect() {
  return <Redirect href="/(tabs)" />
}
