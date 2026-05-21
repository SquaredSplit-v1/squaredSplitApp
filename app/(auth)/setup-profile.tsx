import { Redirect } from 'expo-router'

/** Profile setup lives at /onboarding/profile (see app/onboarding/). */
export default function SetupProfile() {
  return <Redirect href="/onboarding/profile" />
}
