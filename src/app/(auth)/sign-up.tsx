import { zodResolver } from "@hookform/resolvers/zod";
import { Link, router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text, View } from "react-native";
import { signUpWithEmail } from "@/features/auth/api";
import { SignUpValues, signUpSchema } from "@/features/auth/schemas";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { TextField } from "@/shared/ui/TextField";
import { AppLogo } from "@/shared/ui/AppLogo";
import { useTheme } from "@/shared/ui/theme";

export default function SignUpScreen() {
  const { colors, spacing, typography } = useTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { fullName: "", email: "", password: "" },
  });

  const onSubmit = async (values: SignUpValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    const { error } = await signUpWithEmail(values);
    setIsSubmitting(false);

    if (error) {
      setSubmitError(error);
      return;
    }

    router.replace("/(auth)/verify-email");
  };

  return (
    <ScreenContainer scroll>
      <View style={{ alignItems: "center", marginTop: spacing.md, marginBottom: spacing.lg }}>
        <AppLogo size={88} />
      </View>
      <Text style={[typography.display, { color: colors.textPrimary, marginBottom: spacing.xs, textAlign: "center" }]}>
        Sign up
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.xl, textAlign: "center" }]}>
        Create an account to set up your advocate profile.
      </Text>

      <Controller
        control={control}
        name="fullName"
        render={({ field }) => (
          <TextField
            label="Full name"
            placeholder="e.g. Rahul Sharma"
            autoCapitalize="words"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.fullName?.message}
          />
        )}
      />
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
            placeholder="Create a password"
            secureTextEntry
            autoComplete="new-password"
            value={field.value}
            onChangeText={field.onChange}
            error={errors.password?.message}
          />
        )}
      />

      {submitError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>
          {submitError}
        </Text>
      ) : null}

      <Button label="Sign up" onPress={handleSubmit(onSubmit)} loading={isSubmitting} pill />

      <View style={{ height: spacing.lg }} />
      <Link href="/(auth)/sign-in">
        <Text style={[typography.caption, { color: colors.textSecondary, textAlign: "center" }]}>
          Already have an account? <Text style={{ color: colors.brand, fontWeight: "600" }}>Sign in</Text>
        </Text>
      </Link>
    </ScreenContainer>
  );
}
