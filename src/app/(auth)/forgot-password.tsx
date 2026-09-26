import { zodResolver } from "@hookform/resolvers/zod";
import { router } from "expo-router";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { Text } from "react-native";
import { requestPasswordReset } from "@/features/auth/api";
import { ForgotPasswordValues, forgotPasswordSchema } from "@/features/auth/schemas";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { TextField } from "@/shared/ui/TextField";
import { useTheme } from "@/shared/ui/theme";

export default function ForgotPasswordScreen() {
  const { colors, spacing, typography } = useTheme();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: ForgotPasswordValues) => {
    setSubmitError(null);
    setIsSubmitting(true);
    const { error } = await requestPasswordReset(values.email);
    setIsSubmitting(false);
    if (error) {
      setSubmitError(error);
      return;
    }
    setSent(true);
  };

  return (
    <ScreenContainer scroll>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Reset your password
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Enter your account email and we&apos;ll send you a reset link.
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
            value={field.value}
            onChangeText={field.onChange}
            error={errors.email?.message}
          />
        )}
      />

      {submitError ? (
        <Text style={[typography.caption, { color: colors.danger, marginBottom: spacing.md }]}>
          {submitError}
        </Text>
      ) : null}
      {sent ? (
        <Text style={[typography.caption, { color: colors.success, marginBottom: spacing.md }]}>
          Reset link sent. Check your email.
        </Text>
      ) : null}

      <Button label="Send reset link" onPress={handleSubmit(onSubmit)} loading={isSubmitting} />

      <Button label="Back to sign in" variant="ghost" onPress={() => router.back()} />
    </ScreenContainer>
  );
}
