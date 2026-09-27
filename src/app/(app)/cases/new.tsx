import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { createCase } from "@/features/cases/api";
import { Client, getClient, listClients } from "@/features/clients/api";
import { CASE_TYPE_OPTIONS } from "@/shared/data/caseTypes";
import { COURT_OPTIONS } from "@/shared/data/courts";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { SelectField } from "@/shared/ui/SelectField";
import { TextField } from "@/shared/ui/TextField";
import { useTheme } from "@/shared/ui/theme";

export default function NewCaseScreen() {
  const { clientId: preselectedClientId } = useLocalSearchParams<{ clientId?: string }>();
  const { colors, spacing, radius, typography } = useTheme();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [clientOptions, setClientOptions] = useState<Client[] | null>(null);

  const [title, setTitle] = useState("");
  const [caseNumber, setCaseNumber] = useState("");
  const [caseType, setCaseType] = useState("");
  const [court, setCourt] = useState("");
  const [oppositeParty, setOppositeParty] = useState("");
  const [description, setDescription] = useState("");
  const [agreedFee, setAgreedFee] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (preselectedClientId) {
      getClient(preselectedClientId).then(setSelectedClient).catch((err) => setError(err.message));
    } else {
      listClients().then(setClientOptions).catch((err) => setError(err.message));
    }
  }, [preselectedClientId]);

  const handleSave = async () => {
    if (!selectedClient) {
      setError("Select a client for this case");
      return;
    }
    if (!title.trim()) {
      setError("Case title is required");
      return;
    }
    const fee = agreedFee.trim() ? Number(agreedFee) : null;
    if (fee !== null && (Number.isNaN(fee) || fee < 0)) {
      setError("Enter a valid total fee");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const newCase = await createCase({
        clientId: selectedClient.id,
        title,
        caseNumber,
        caseType,
        court,
        oppositeParty,
        description,
        agreedFee: fee,
      });
      router.replace(`/(app)/cases/${newCase.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!selectedClient && clientOptions === null) {
    return (
      <ScreenContainer style={{ alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={colors.brand} />
      </ScreenContainer>
    );
  }

  if (!selectedClient) {
    return (
      <ScreenContainer scroll>
        <Text style={[typography.title, { color: colors.textPrimary, marginBottom: spacing.xs }]}>
          Select a client
        </Text>
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
          Every case belongs to a client.
        </Text>

        {clientOptions && clientOptions.length === 0 ? (
          <View>
            <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
              You don&apos;t have any clients yet.
            </Text>
            <Button label="Add a client first" onPress={() => router.replace("/(app)/clients/new")} />
          </View>
        ) : (
          clientOptions?.map((client) => (
            <Pressable
              key={client.id}
              onPress={() => setSelectedClient(client)}
              style={{
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderWidth: 1,
                borderRadius: radius.md,
                padding: spacing.md,
                marginBottom: spacing.sm,
              }}
            >
              <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{client.full_name}</Text>
            </Pressable>
          ))
        )}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Text style={[typography.label, { color: colors.textSecondary, marginBottom: spacing.xs }]}>Client</Text>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          backgroundColor: colors.surfaceAlt,
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.lg,
        }}
      >
        <Text style={[typography.bodyStrong, { color: colors.textPrimary }]}>{selectedClient.full_name}</Text>
        {!preselectedClientId ? (
          <Text style={[typography.caption, { color: colors.brand }]} onPress={() => setSelectedClient(null)}>
            Change
          </Text>
        ) : null}
      </View>

      <TextField label="Case title" placeholder="e.g. Sharma vs. Verma" value={title} onChangeText={setTitle} />
      <TextField label="Case number" value={caseNumber} onChangeText={setCaseNumber} />
      <SelectField
        label="Case type"
        icon="folder-outline"
        value={caseType || null}
        options={CASE_TYPE_OPTIONS.map((c) => ({ value: c, label: c }))}
        onChange={setCaseType}
        allowCustom
        searchable
        placeholder="Select case type"
      />
      <SelectField
        label="Court"
        icon="business-outline"
        value={court || null}
        options={COURT_OPTIONS.map((c) => ({ value: c, label: c }))}
        onChange={setCourt}
        allowCustom
        placeholder="Select court"
      />
      <TextField label="Opposite party" value={oppositeParty} onChangeText={setOppositeParty} />
      <TextField
        label="Total fees agreed (₹)"
        placeholder="Fee agreed with the client (optional)"
        value={agreedFee}
        onChangeText={setAgreedFee}
        keyboardType="decimal-pad"
      />
      <TextField label="Description" value={description} onChangeText={setDescription} multiline numberOfLines={3} />

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label="Create case" onPress={handleSave} loading={isSubmitting} />
    </ScreenContainer>
  );
}
