import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Share, Text, View } from "react-native";
import { exportMyData } from "@/features/account/api";
import { getAppLockMethod } from "@/features/applock/appLock";
import { LockMethod } from "@/features/applock/rules";
import { requestPasswordReset } from "@/features/auth/api";
import { useAuth } from "@/features/auth/AuthProvider";
import { authenticateBiometric, disableBiometric, enableBiometric, getBiometricSupport, isBiometricEnabledFor } from "@/features/biometric/biometric";
import { syncCalendarReminders } from "@/features/notifications/device";
import { AdvocateProfile, getMyProfile, updateMyProfile } from "@/features/profile/api";
import { SegmentedControl } from "@/shared/ui/SegmentedControl";
import { SettingsGroup, SettingsRow } from "@/shared/ui/SettingsGroup";
import { useTheme } from "@/shared/ui/theme";
import { getThemePreference, setThemePreference, ThemePreference, themePreferenceLabel } from "@/shared/ui/themePreference";

type Visibility = AdvocateProfile["profile_visibility"];

const visibilityHelp: Record<Visibility, string> = {
  public: "Any advocate can find you in Network search.",
  connections_only: "You appear in search, but only connections see your full profile.",
  private: "You're hidden from Network search.",
};

export default function SettingsScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const { session } = useAuth();
  const email = session?.user.email;
  const userId = session?.user.id ?? null;
  const [visibility, setVisibility] = useState<Visibility | null>(null);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [biometric, setBiometric] = useState({ available: false, label: "Biometrics", enabled: false });
  const [lockMethod, setLockMethod] = useState<LockMethod | null>(null);

  useEffect(() => {
    getMyProfile()
      .then((p) => {
        setVisibility(p.profile_visibility);
        setNotificationsOn(p.notifications_enabled !== false);
      })
      .catch(() => setVisibility("public"));
    getThemePreference().then(setThemePref).catch(() => {});
  }, []);

  // Security state can change on the App lock screen, so refresh on return.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      Promise.all([getBiometricSupport(), isBiometricEnabledFor(userId), getAppLockMethod(userId)])
        .then(([support, enabled, method]) => {
          setBiometric({ ...support, enabled });
          setLockMethod(method);
        })
        .catch(() => {});
    }, [userId]),
  );

  const handleThemePress = () => {
    const choose = (pref: ThemePreference) => () => {
      setThemePref(pref);
      setThemePreference(pref);
    };
    Alert.alert(
      "Theme",
      "Choose how LexConnect looks.",
      [
        { text: themePreferenceLabel.system, onPress: choose("system") },
        { text: themePreferenceLabel.light, onPress: choose("light") },
        { text: themePreferenceLabel.dark, onPress: choose("dark") },
      ],
      { cancelable: true },
    );
  };

  const handleNotificationsToggle = async (enabled: boolean) => {
    setNotificationsOn(enabled);
    try {
      await updateMyProfile({ notifications_enabled: enabled });
      // Turn calendar reminders on this phone on / off straight away.
      await syncCalendarReminders(enabled).catch(() => {});
    } catch (err) {
      setNotificationsOn(!enabled);
      Alert.alert("Couldn't update notifications", err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    if (!userId) return;
    if (!enabled) {
      await disableBiometric();
      setBiometric((b) => ({ ...b, enabled: false }));
      return;
    }
    const support = await getBiometricSupport();
    if (!support.available) {
      Alert.alert("Biometrics unavailable", "Set up Face ID, Touch ID or a fingerprint in your device settings first.");
      return;
    }
    if (await authenticateBiometric(`Enable ${support.label} login`)) {
      await enableBiometric(userId, email);
      setBiometric((b) => ({ ...b, enabled: true }));
      Alert.alert(`${support.label} enabled`, `Next time you open LexConnect or log back in, use ${support.label} instead of your password.`);
    }
  };

  const handleVisibilityChange = async (next: string) => {
    const previous = visibility;
    setVisibility(next as Visibility);
    try {
      await updateMyProfile({ profile_visibility: next as Visibility });
    } catch (err) {
      setVisibility(previous);
      Alert.alert("Couldn't update visibility", err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleChangePassword = () => {
    if (!email) return;
    Alert.alert("Change password", `We'll email a password reset link to ${email}.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send link",
        onPress: async () => {
          const { error } = await requestPasswordReset(email);
          if (error) Alert.alert("Couldn't send reset link", error);
          else Alert.alert("Check your email", "Open the link on this device to set a new password.");
        },
      },
    ]);
  };

  const handleExportData = async () => {
    setIsExporting(true);
    try {
      const data = await exportMyData();
      await Share.share({
        title: "LexConnect data export",
        message: JSON.stringify(data, null, 2),
      });
    } catch (err) {
      Alert.alert("Export failed", err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxl }}
    >
      <View>
        <Text
          style={[
            typography.label,
            { color: colors.textSecondary, textTransform: "uppercase", marginLeft: spacing.sm, marginBottom: spacing.sm },
          ]}
        >
          Privacy
        </Text>
        <View style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }}>
          <Text style={[typography.bodyStrong, { color: colors.textPrimary, marginBottom: spacing.sm }]}>
            Profile visibility
          </Text>
          {visibility ? (
            <>
              <SegmentedControl
                segments={[
                  { key: "public", label: "Public" },
                  { key: "connections_only", label: "Connections" },
                  { key: "private", label: "Private" },
                ]}
                value={visibility}
                onChange={handleVisibilityChange}
              />
              <Text style={[typography.caption, { color: colors.textSecondary, marginTop: spacing.sm }]}>
                {visibilityHelp[visibility]}
              </Text>
            </>
          ) : null}
        </View>
      </View>

      <SettingsGroup title="Preferences">
        <SettingsRow icon="color-palette-outline" label="Theme" subtitle={themePreferenceLabel[themePref]} onPress={handleThemePress} />
        <SettingsRow
          icon="notifications-outline"
          label="Notifications"
          subtitle={notificationsOn ? "On" : "Off"}
          toggle={{ value: notificationsOn, onChange: handleNotificationsToggle }}
        />
      </SettingsGroup>

      <SettingsGroup title="Security">
        <SettingsRow
          icon="finger-print-outline"
          label={`${biometric.label} login`}
          subtitle={biometric.available ? "Unlock and log in without your password" : "Not set up on this device"}
          toggle={{ value: biometric.enabled, onChange: handleBiometricToggle, disabled: !biometric.available }}
        />
        <SettingsRow
          icon="keypad-outline"
          label="App lock (PIN or pattern)"
          subtitle={lockMethod === "pin" ? "On · PIN" : lockMethod === "pattern" ? "On · Pattern" : "Off"}
          onPress={() => router.push("/(app)/app-lock")}
        />
      </SettingsGroup>

      <SettingsGroup title="Account">
        <SettingsRow icon="mail-outline" label="Login email" subtitle={email} />
        <SettingsRow icon="key-outline" label="Change password" onPress={handleChangePassword} />
      </SettingsGroup>

      <SettingsGroup title="Your data">
        <SettingsRow
          icon="download-outline"
          label="Export my data"
          subtitle={isExporting ? "Preparing export…" : "Share a copy of everything you own"}
          onPress={handleExportData}
        />
      </SettingsGroup>
    </ScrollView>
  );
}
