import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text } from "react-native";
import { completeHearing, getHearing, Hearing } from "@/features/hearings/api";
import { Badge } from "@/shared/ui/Badge";
import { Button } from "@/shared/ui/Button";
import { DateField } from "@/shared/ui/DateField";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { TextField } from "@/shared/ui/TextField";
import { useTheme } from "@/shared/ui/theme";

export default function HearingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, typography } = useTheme();

  const [hearing, setHearing] = useState<Hearing | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [outcome, setOutcome] = useState("");
  const [argumentsText, setArgumentsText] = useState("");
  const [orders, setOrders] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextHearingAt, setNextHearingAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    getHearing(id)
      .then((data) => {
        setHearing(data);
        setOutcome(data.outcome ?? "");
        setArgumentsText(data.arguments ?? "");
        setOrders(data.orders ?? "");
        setNextAction(data.next_action ?? "");
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleComplete = async () => {
    if (!hearing) return;

    setError(null);
    setIsSubmitting(true);
    try {
      await completeHearing(hearing.id, {
        status: "completed",
        outcome,
        arguments: argumentsText,
        orders,
        nextAction,
        nextHearingAt,
      });
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <ScreenContainer style={{ alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brand} />
      </ScreenContainer>
    );
  }

  if (!hearing) {
    return (
      <ScreenContainer style={{ alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: colors.danger }}>{error ?? "Hearing not found"}</Text>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Badge label={hearing.status} tone={hearing.status === "completed" ? "success" : "brand"} />
      <Text style={[typography.title, { color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.lg }]}>
        {hearing.hearing_type ?? "Hearing"}
      </Text>

      <Text style={[typography.subtitle, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
        Record outcome
      </Text>
      <TextField label="What happened / outcome" value={outcome} onChangeText={setOutcome} multiline numberOfLines={3} />
      <TextField label="Arguments" value={argumentsText} onChangeText={setArgumentsText} multiline numberOfLines={2} />
      <TextField label="Orders" value={orders} onChangeText={setOrders} multiline numberOfLines={2} />
      <TextField label="Next action" value={nextAction} onChangeText={setNextAction} multiline numberOfLines={2} />
      <DateField
        label="Next hearing"
        value={nextHearingAt}
        onChange={setNextHearingAt}
        mode="datetime"
        placeholder="Not scheduled"
        minimumDate={new Date()}
        optional
      />

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Mark hearing completed" onPress={handleComplete} loading={isSubmitting} />
    </ScreenContainer>
  );
}
