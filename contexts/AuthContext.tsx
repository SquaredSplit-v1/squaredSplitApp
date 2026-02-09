import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { AuthChangeEvent, Session, User } from "@supabase/supabase-js";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

// ─── Storage Keys ──────────────────────────────────────────────────────────

const ONBOARDING_COMPLETE_KEY = "@squaredsplit/onboarding_complete";

// ─── Context Type ──────────────────────────────────────────────────────────

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  /** Has the current user completed onboarding? */
  hasCompletedOnboarding: boolean;
  /** Mark onboarding as done (persisted per-user). */
  completeOnboarding: () => Promise<void>;
  /** Sign the user out and clear local flags. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  hasCompletedOnboarding: false,
  completeOnboarding: async () => {},
  signOut: async () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);

  // ── Onboarding helpers ─────────────────────────────────────────────────

  const loadOnboardingFlag = useCallback(async (uid: string) => {
    try {
      const value = await AsyncStorage.getItem(`${ONBOARDING_COMPLETE_KEY}:${uid}`);
      setHasCompletedOnboarding(value === "true");
    } catch {
      setHasCompletedOnboarding(false);
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    if (!user) return;
    try {
      await AsyncStorage.setItem(`${ONBOARDING_COMPLETE_KEY}:${user.id}`, "true");
      setHasCompletedOnboarding(true);
    } catch {
      // best-effort
    }
  }, [user]);

  // ── Auth state listener ────────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    // 1. Hydrate from persisted session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        loadOnboardingFlag(s.user.id);
      }
      setIsLoading(false);
    });

    // 2. Realtime listener for auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, s: Session | null) => {
        if (!mounted) return;

        setSession(s);
        setUser(s?.user ?? null);
        setIsLoading(false);

        switch (event) {
          case "SIGNED_IN":
          case "TOKEN_REFRESHED":
            if (s?.user) {
              loadOnboardingFlag(s.user.id);
            }
            break;

          case "SIGNED_OUT":
            setHasCompletedOnboarding(false);
            break;
        }
      },
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadOnboardingFlag]);

  // ── Sign out ───────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // State is cleared by the onAuthStateChange SIGNED_OUT handler above
  }, []);

  // ── Memoised value ────────────────────────────────────────────────────

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      hasCompletedOnboarding,
      completeOnboarding,
      signOut,
    }),
    [user, session, isLoading, hasCompletedOnboarding, completeOnboarding, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
