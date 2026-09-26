import * as Linking from "expo-linking";
import { supabase } from "./supabase";

/**
 * Both the email-confirmation link (sign-up) and the password-reset link
 * redirect back into the app as `counselconnect://<path>?code=...` (PKCE).
 * Clicking the link only verifies the token server-side; it does NOT log the
 * device in by itself — supabase-js needs the `code` exchanged for a real
 * session, which normally happens automatically via detectSessionInUrl on
 * web, but has no native equivalent. This does that exchange manually.
 *
 * Safe to call with any URL, including ones with no `code` param (e.g. a
 * plain cold start) — those are silently ignored.
 */
export async function consumeAuthDeepLink(url: string | null): Promise<void> {
  if (!url) return;

  const { queryParams } = Linking.parse(url);
  const code = queryParams?.code;
  if (typeof code !== "string") return;

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.warn("Failed to exchange auth deep link code for a session:", error.message);
  }
}
