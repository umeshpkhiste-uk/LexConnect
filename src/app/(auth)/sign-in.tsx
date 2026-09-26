import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { BiometricLoginButton } from "@/features/biometric/BiometricLoginButton";
import { signInWithEmail } from "@/features/auth/api";
import { SignInValues, signInSchema } from "@/features/auth/schemas";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { TextField } from "@/shared/ui/TextField";
import { AppLogo } from "@/shared/ui/AppLogo";
import { useTheme } from "@/shared/ui/theme";

export default function SignInScreen() {
  const { colors, spacing, typography } = useTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (values: SignInValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    const { error } = await signInWithEmail(values);
    setIsSubmitting(false);
    // On success, AuthProvider's onAuthStateChange updates the session and
    // the root navigator's Stack.Protected guard switches to the (app) group.
    if (error) setSubmitError(error);
  };

  return (
    <ScreenContainer scroll>
      <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.lg }}>
        <AppLogo size={88} />
      </View>
      <Text style={[typography.display, { color: colors.textPrimary, marginBottom: spacing.xs, textAlign: "center" }]}>
        Log in
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl, textAlign: "center" }]}>
        Login to access your LexConnect account.
      </Text>

      <Controller
        control={control}
        name="email"
        render={({ field }) => (
          <TextField
            label="Email"
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field }) => (
          <TextField
            label="Password"
            placeholder="Your password"
            secureTextEntry
            autoComplete="password"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />

      <Link href="/(auth)/forgot-password" style={{ marginBottom: spacing.lg }}>
        <Text style={[typography.caption, { color: colors.brand, fontWeight: "600" }]}>
          Forgot password?
        </Text>
      </Link>

      {submitError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>
          {submitError}
        </Text>
      ) : null}

      <Button label="Log in" onPress={handleSubmit(onSubmit)} loading={isSubmitting} pill />
      <View style={{ height: spacing.md }} />
      <BiometricLoginButton />

      <View style={{ height: spacing.lg }} />
      <Link href="/(auth)/sign-up">
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: "center" }]}>
          New to LexConnect? <Text style={{ color: colors.brand, fontWeight: "600" }}>Create an account</Text>
        </Text>
      </Link>
    </ScreenContainer>
  );
}
