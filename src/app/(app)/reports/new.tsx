import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";
import { ReportTargetType, submitReport } from "@/features/reports/api";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { TextField } from "@/shared/ui/TextField";
import { useTheme } from "@/shared/ui/theme";

export default function NewReportScreen() {
  const { targetType, targetId, label } = useLocalSearchParams<{
    targetType: ReportTargetType;
    targetId: string;
    label?: string;
  }>();
  const { colors, spacing, typography } = useTheme();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setError("Tell us what's wrong");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await submitReport({ targetType, targetId, reason });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <ScreenContainer style={{ alignItems: "center", justifyContent: "center" }}>
        <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.sm, textAlign: "center" }]}>
          Report submitted
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, textAlign: "center", marginBottom: spacing.lg }]}>
          Thanks — we&apos;ll review it.
        </Text>
        <Button label="Done" onPress={() => router.back()} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
        Report {label ?? targetType}
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
        Tell us what&apos;s wrong. Reports are reviewed by LexConnect.
      </Text>

      <TextField
        label="Reason"
        placeholder="Describe the issue"
        value={reason}
        onChangeText={setReason}
        multiline
        numberOfLines={4}
        style={{ height: 100, paddingTop: spacing.sm, textAlignVertical: "top" }}
      />

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Submit report" onPress={handleSubmit} loading={isSubmitting} />
    </ScreenContainer>
  );
}
