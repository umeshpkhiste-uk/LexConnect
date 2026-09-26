import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getReceiptUrl, getTransaction, TransactionDetail } from "@/features/transactions/api";
import { formatINR } from "@/shared/lib/format";
import { useTheme } from "@/shared/ui/theme";

function formatDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

/** Read-only details of a transaction, including its receipt / screenshot.
 * Pending fees open the edit page instead. */
export default function TransactionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, spacing, radius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const [tx, setTx] = useState<TransactionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [viewerOpen, setViewerOpen] = useState(false);

  useEffect(() => {
    getTransaction(id)
      .then((t) => {
        if (t.type === "income" && t.status === "pending") {
          router.replace(`/(app)/transactions/receive?id=${t.id}`);
          return;
        }
        setTx(t);
        if (t.receipt_path) getReceiptUrl(t.receipt_path).then(setReceiptUrl).catch(() => {});
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Couldn't load this entry"));
  }, [id]);

  if (!tx) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ title: "Payment details" }} />
        {error ? <Text style={{ color: colors.danger }}>{error}</Text> : <ActivityIndicator color={colors.brand} />}
      </View>
    );
  }

  const isExpense = tx.type === "expense";
  const tone = isExpense ? colors.danger : colors.success;
  const rows: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string | null }[] = [
    { icon: "pricetag-outline", label: "Category", value: tx.category },
    { icon: "calendar-outline", label: isExpense ? "Date" : "Received on", value: formatDay(tx.transaction_date) },
    { icon: "person-outline", label: "Client", value: tx.clients?.full_name ?? null },
    { icon: "briefcase-outline", label: "Case", value: tx.cases?.title ?? null },
    { icon: "wallet-outline", label: "Payment method", value: tx.payment_method },
    { icon: "document-text-outline", label: "Reference", value: tx.reference_number },
    { icon: "reader-outline", label: "Notes", value: tx.notes },
  ];

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={{ padding: spacing.md, gap: spacing.md, paddingBottom: spacing.xxl }}>
      <Stack.Screen options={{ title: isExpense ? "Expense details" : "Payment details" }} />

      <View style={[styles.card, styles.hero, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg }]}>
        <View style={[styles.badge, { backgroundColor: `${tone}1F` }]}>
          <Ionicons name={isExpense ? "arrow-up" : "checkmark-circle"} size={14} color={tone} />
          <Text style={[typography.label, { color: tone }]}>{isExpense ? "Expense" : "Received"}</Text>
        </View>
        <Text style={[typography.display, { color: tone, fontSize: 34, marginTop: spacing.sm }]}>
          {isExpense ? "−" : ""}
          {formatINR(Number(tx.amount))}
        </Text>
        <View style={[styles.lockNote, { marginTop: spacing.xs }]}>
          <Ionicons name="lock-closed-outline" size={12} color={colors.textSecondary} />
          <Text style={[typography.caption, { color: colors.textSecondary }]}>Recorded entries can&apos;t be edited</Text>
        </View>
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: spacing.md }]}>
        {rows
          .filter((r) => r.value)
          .map((r, i) => (
            <View key={r.label} style={[styles.row, { borderTopColor: colors.border, borderTopWidth: i ? StyleSheet.hairlineWidth : 0 }]}>
              <Ionicons name={r.icon} size={18} color={colors.textSecondary} />
              <Text style={[typography.body, { color: colors.textSecondary, width: 120 }]}>{r.label}</Text>
              <Text style={[typography.bodyStrong, { color: colors.textPrimary, flex: 1, textAlign: "right" }]}>{r.value}</Text>
            </View>
          ))}
      </View>

      <View style={[styles.card, { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md }]}>
        <Text style={[typography.subtitle, { color: colors.textPrimary, marginBottom: spacing.sm }]}>Receipt / screenshot</Text>
        {!tx.receipt_path ? (
          <Text style={[typography.body, { color: colors.textSecondary }]}>No receipt was attached.</Text>
        ) : receiptUrl ? (
          <Pressable onPress={() => setViewerOpen(true)} accessibilityLabel="View receipt full screen">
            <Image source={{ uri: receiptUrl }} style={{ width: "100%", height: 260, borderRadius: radius.md }} contentFit="cover" transition={150} />
            <Text style={[typography.caption, { color: colors.brand, textAlign: "center", marginTop: spacing.xs }]}>Tap to view full screen</Text>
          </Pressable>
        ) : (
          <ActivityIndicator color={colors.brand} />
        )}
      </View>

      <Modal visible={viewerOpen} transparent animationType="fade" onRequestClose={() => setViewerOpen(false)}>
        <Pressable style={styles.viewer} onPress={() => setViewerOpen(false)} accessibilityLabel="Close receipt">
          {receiptUrl ? <Image source={{ uri: receiptUrl }} style={{ width: "100%", height: "85%" }} contentFit="contain" /> : null}
          <View style={[styles.viewerClose, { top: insets.top + 12 }]}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </View>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  hero: { alignItems: "center" },
  badge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  lockNote: { flexDirection: "row", alignItems: "center", gap: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 14 },
  viewer: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", alignItems: "center", justifyContent: "center" },
  viewerClose: { position: "absolute", right: 20 },
});
