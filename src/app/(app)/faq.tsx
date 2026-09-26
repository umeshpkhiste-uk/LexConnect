import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTheme } from "@/shared/ui/theme";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Who can see my clients and cases?",
    a: "Only you. Clients, cases, hearings, documents and payments are private to your account and are never shared with other advocates.",
  },
  {
    q: "What do other advocates see in Network?",
    a: "Your professional profile — name, headline, about, city, practice areas and courts. You can make your profile connections-only or private from Profile → Settings → Profile visibility. Basic information like your date of birth, phone and address is never shown.",
  },
  {
    q: "How do I add a case?",
    a: "Add a client first from the Cases tab, then create a case for that client. Hearings, meetings, tasks and payments are added from inside the case.",
  },
  {
    q: "How do I schedule a hearing?",
    a: "Open the case and tap to schedule a hearing. It will appear on your Calendar and on the Home screen on the day.",
  },
  {
    q: "How does Face ID / fingerprint login work?",
    a: "Turn it on from Profile → Preferences. After that, LexConnect asks for your Face ID or fingerprint when you open the app, and after you log out you can log back in with it instead of your password.",
  },
  {
    q: "How do I turn off notifications?",
    a: "Use the Notifications switch in Profile → Preferences. While it's off, no new in-app notifications are created for you.",
  },
  {
    q: "I forgot my password. What do I do?",
    a: "Tap \"Forgot password?\" on the log in screen, or Profile → Settings → Change password when signed in. We'll email you a reset link — open it on this device.",
  },
  {
    q: "Can I get a copy of my data or delete my account?",
    a: "Yes. Profile → Settings → Export my data shares a full copy of everything you own. Delete account permanently removes your account and all its records.",
  },
];

export default function FaqScreen() {
  const { colors, spacing, radius, typography } = useTheme();
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xxl }}
    >
      {FAQS.map((item, i) => {
        const isOpen = openIndex === i;
        return (
          <View key={item.q} style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg }]}>
            <Pressable
              onPress={() => setOpenIndex(isOpen ? null : i)}
              style={[styles.question, { padding: spacing.md }]}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
            >
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1 }]}>{item.q}</Text>
              <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={18} color={colors.textSecondary} />
            </Pressable>
            {isOpen ? (
              <Text
                style={[
                  typography.body,
                  { color: colors.textSecondary, paddingHorizontal: spacing.md, paddingBottom: spacing.md },
                ]}
              >
                {item.a}
              </Text>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  question: { flexDirection: "row", alignItems: "center", gap: 12 },
});
