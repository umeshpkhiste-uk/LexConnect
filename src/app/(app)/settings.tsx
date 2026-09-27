import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, ScrollView, Share } from "react-native";
import { exportMyData } from "@/features/account/api";
import { getAppLockMethod } from "@/features/applock/appLock";
import { LockMethod } from "@/features/applock/rules";
import { useAuth } from "@/features/auth/AuthProvider";
import { authenticateBiometric, disableBiometric, enableBiometric, getBiometricSupport, isBiometricEnabledFor } from "@/features/biometric/biometric";
import { SettingsGroup, SettingsRow } from "@/shared/ui/SettingsGroup";
import { useTheme } from "@/shared/ui/theme";
import { getThemePreference, setThemePreference, ThemePreference, themePreferenceLabel } from "@/shared/ui/themePreference";

/** Device / app-level settings. Account settings (profile visibility,
 * password, notifications, language) live on the Profile tab instead — see
 * profile.tsx's "Account" section. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { colors, spacing } = useTheme();
  const { session } = useAuth();
  const email = session?.user.email;
  const userId = session?.user.id ?? null;
  const [isExporting, setIsExporting] = useState(false);
  const [themePref, setThemePref] = useState<ThemePreference>("system");
  const [biometric, setBiometric] = useState({ available: false, label: "Biometrics", enabled: false });
  const [lockMethod, setLockMethod] = useState<LockMethod | null>(null);

  useEffect(() => {
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
      <SettingsGroup title={t("settings.preferences")}>
        <SettingsRow icon="color-palette-outline" label={t("settings.theme")} subtitle={themePreferenceLabel[themePref]} onPress={handleThemePress} />
      </SettingsGroup>

      <SettingsGroup title={t("settings.security")}>
        <SettingsRow
          icon="finger-print-outline"
          label={`${biometric.label} login`}
          subtitle={biometric.available ? "Unlock and log in without your password" : "Not set up on this device"}
          toggle={{ value: biometric.enabled, onChange: handleBiometricToggle, disabled: !biometric.available }}
        />
        <SettingsRow
          icon="keypad-outline"
          label={t("settings.appLock")}
          subtitle={lockMethod === "pin" ? t("settings.appLockOnPin") : lockMethod === "pattern" ? t("settings.appLockOnPattern") : t("settings.appLockOff")}
          onPress={() => router.push("/(app)/app-lock")}
        />
      </SettingsGroup>

      <SettingsGroup title={t("settings.yourData")}>
        <SettingsRow
          icon="download-outline"
          label={t("settings.exportData")}
          subtitle={isExporting ? t("settings.exportDataPreparing") : t("settings.exportDataSubtitle")}
          onPress={handleExportData}
        />
      </SettingsGroup>
    </ScrollView>
  );
}
