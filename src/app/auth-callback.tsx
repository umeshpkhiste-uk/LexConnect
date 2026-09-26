import { Redirect } from "expo-router";

/**
 * Landing route for social sign-in redirects (`<scheme>://auth-callback`).
 * The code exchange happens in socialLogin / the deep-link listener; if the
 * OS also opens this route, just continue into the app.
 */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
