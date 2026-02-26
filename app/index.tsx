import { Redirect } from "expo-router";

export default function Index() {
  // Check if user is authenticated here
  // For now, always redirect to auth loading
  return <Redirect href="/dashboard/dashboard" />;
}
