import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { createContext, PropsWithChildren, useContext, useEffect, useState } from "react";
import { consumeAuthDeepLink } from "@/shared/lib/authDeepLink";
import { supabase } from "@/shared/lib/supabase";

type AuthContextValue = {
  session: Session | null;
  isLoading: boolean;
  /** True once a password-recovery deep link has been consumed, until the
   * user finishes setting a new password. A recovery link does establish a
   * real session (that's how Supabase lets updateUser() work), so this flag
   * is what keeps the app on the "set new password" screen instead of the
   * root navigator treating the user as normally signed in. */
  isPasswordRecovery: boolean;
  clearPasswordRecovery: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authSubscription } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") setIsPasswordRecovery(true);
      setSession(nextSession);
    });

    // Cold start: the app may have been opened directly from an email link.
    Linking.getInitialURL().then(consumeAuthDeepLink);
    // Warm start: the app was already open (backgrounded) when the link was tapped.
    const linkingSubscription = Linking.addEventListener("url", ({ url }) => consumeAuthDeepLink(url));

    return () => {
      authSubscription.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        isLoading,
        isPasswordRecovery,
        clearPasswordRecovery: () => setIsPasswordRecovery(false),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
