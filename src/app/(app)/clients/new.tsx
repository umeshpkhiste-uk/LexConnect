import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, View } from "react-native";
import { Client, ClientType, createClientRecord, getClient, updateClient, uploadClientPhoto } from "@/features/clients/api";
import { ClientAvatar } from "@/features/clients/ClientAvatar";
import { Button } from "@/shared/ui/Button";
import { ScreenContainer } from "@/shared/ui/ScreenContainer";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { TextField } from "@/shared/ui/TextField";
import { useTheme } from "@/shared/ui/theme";

/** New client, or — with ?id= — edit an existing client's details and photo. */
export default function NewClientScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = !!id;
  const { colors, spacing, typography } = useTheme();
  const [existing, setExisting] = useState<Client | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(null);
  const [fullName, setFullName] = useState("");
  const [clientType, setClientType] = useState<ClientType>("individual");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!id) return;
    getClient(id)
      .then((c) => {
        setExisting(c);
        setFullName(c.full_name);
        setClientType(c.client_type);
        setPhone(c.phone ?? "");
        setEmail(c.email ?? "");
        setAddress(c.address ?? "");
        setNotes(c.notes ?? "");
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Couldn't load this client"));
  }, [id]);

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError("Client name is required");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      if (existing) {
        await updateClient(existing.id, {
          fullName,
          clientType,
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: address.trim() || null,
          notes: notes.trim() || null,
        });
        if (photo) {
          await uploadClientPhoto(existing, photo.uri, photo.mimeType).catch(() =>
            Alert.alert("Photo not saved", "The details were saved, but the photo couldn't be uploaded. Please try again."),
          );
        }
        router.back();
        return;
      }
      const client = await createClientRecord({ fullName, clientType, phone, email, address, notes });
      if (photo) {
        // The client is saved either way; a failed photo can be added later.
        await uploadClientPhoto(client, photo.uri, photo.mimeType).catch(() =>
          Alert.alert(
            "Photo not saved",
            "The client was added, but the photo couldn't be uploaded. You can add it from the client's page.",
          ),
        );
      }
      router.replace(`/(app)/cases/new?clientId=${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert("Permission needed", "Allow photo access in Settings to add a client photo.");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    const asset = result.canceled ? null : result.assets[0];
    if (asset) setPhoto({ uri: asset.uri, mimeType: asset.mimeType ?? "image/jpeg" });
  };

  if (isEdit && !existing) {
    return (
      <ScreenContainer style={{ alignItems: "center", justifyContent: "center" }}>
        <Stack.Screen options={{ title: "Edit client" }} />
        {loadError ? <Text style={{ color: colors.danger }}>{loadError}</Text> : <ActivityIndicator color={colors.brand} />}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer scroll>
      <Stack.Screen options={{ title: isEdit ? "Edit client" : "New client" }} />
      <Pressable onPress={pickPhoto} style={{ alignItems: "center", marginBottom: spacing.md }} accessibilityLabel="Add client photo">
        <View>
          <ClientAvatar
            name={fullName || "?"}
            photoPath={existing?.photo_path ?? null}
            clientType={clientType}
            localUri={photo?.uri}
            size={84}
          />
          <View
            style={{
              position: "absolute",
              right: 0,
              bottom: 0,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: colors.brand,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Ionicons name="camera" size={15} color={colors.textInverse} />
          </View>
        </View>
        <Text style={[typography.caption, { color: colors.brand, marginTop: spacing.xs }]}>
          {photo || existing?.photo_path ? "Change photo" : "Add photo (optional)"}
        </Text>
      </Pressable>
      <SegmentedControl
        segments={[
          { key: "individual", label: "Individual" },
          { key: "organization", label: "Organization" },
        ]}
        value={clientType}
        onChange={(key) => setClientType(key as ClientType)}
      />
      <TextField label="Full name" value={fullName} onChangeText={setFullName} autoCapitalize="words" />
      <TextField label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <TextField label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <TextField label="Address" value={address} onChangeText={setAddress} multiline numberOfLines={2} />
      <TextField label="Notes" value={notes} onChangeText={setNotes} multiline numberOfLines={3} />

      {error ? <Text style={{ color: colors.danger, marginBottom: spacing.md }}>{error}</Text> : null}

      <Button label={isEdit ? "Save changes" : "Save client"} onPress={handleSave} loading={isSubmitting} />
    </ScreenContainer>
  );
}
