import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing Supabase configuration. Ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are set for the current environment (${process.env.EXPO_PUBLIC_APP_ENV ?? "unknown"}).`
  );
}

// Check if we're in a browser/React Native environment (not SSR)
const isClient =
  Platform.OS !== "web" || (typeof window !== "undefined" && !!window.document);

// Create a lazy-initialized client to avoid SSR issues with AsyncStorage
let _supabase: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        ...(isClient ? { storage: AsyncStorage } : {}),
        autoRefreshToken: true,
        persistSession: isClient,
        detectSessionInUrl: false,
      },
    });
  }
  return _supabase;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabaseClient(), prop);
  },
});