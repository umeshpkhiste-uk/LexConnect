import { Alert, Linking, Platform, Share } from "react-native";
import { formatINR } from "@/shared/lib/format";
import type { Transaction } from "./api";

export type StatementRange = { from: string; to: string };

type StatementInput = {
  clientName: string;
  caseTitle?: string | null;
  caseNumber?: string | null;
  advocateName?: string | null;
  transactions: (Transaction & { cases?: { title: string } | null })[];
  /** Fee position from the agreed fees; defaults to summing the entries.
   * Always the running, all-time position — a period statement still shows
   * the real outstanding balance, not a balance scoped to that period. */
  totals?: { totalFees: number; received: number; pending: number };
  /** Restricts the listed entries (and the "received in period" figure) to
   * this inclusive date range (YYYY-MM-DD). Omit for the complete history. */
  range?: StatementRange | null;
  /** Shown on the statement, e.g. "September 2026" or "1 Jan – 31 Mar 2026".
   * Defaults to "Complete transaction history" when `range` is omitted. */
  periodLabel?: string;
};

function formatDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Plain-text statement for the client. Only fee (income) entries are
 * included — the advocate's own expenses are internal bookkeeping.
 */
export function buildStatement({
  clientName,
  caseTitle,
  caseNumber,
  advocateName,
  transactions,
  totals,
  range,
  periodLabel,
}: StatementInput): string {
  const fees = transactions.filter((t) => t.type === "income");
  const periodFees = range ? fees.filter((t) => t.transaction_date >= range.from && t.transaction_date <= range.to) : fees;

  const overallReceived = totals?.received ?? fees.filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const overallPending = totals?.pending ?? fees.filter((t) => t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const overallTotal = totals?.totalFees ?? overallReceived + overallPending;
  const periodReceived = periodFees.filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);

  const lines = [
    `Payment statement — ${clientName}`,
    caseTitle ? `Case: ${caseTitle}${caseNumber ? ` (${caseNumber})` : ""}` : null,
    `Period: ${periodLabel ?? "Complete transaction history"}`,
    `Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    "",
    ...(range
      ? [`Received in this period: ${formatINR(periodReceived)}`, `Outstanding balance (overall): ${formatINR(overallPending)}`]
      : [
          `Total fees: ${formatINR(overallTotal)}`,
          `Received: ${formatINR(overallReceived)}`,
          `Balance due: ${formatINR(overallPending)}`,
        ]),
    "",
    "Details:",
    ...(periodFees.length === 0
      ? [range ? "No fee entries in this period." : "No fee entries yet."]
      : [...periodFees]
          .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
          .map(
            (t) =>
              `• ${formatDay(t.transaction_date)} — ${t.category}${!caseTitle && t.cases?.title ? ` (${t.cases.title})` : ""}: ${formatINR(Number(t.amount))} ${t.status === "pending" ? "(due)" : "(received)"}`
          )),
    "",
    advocateName ? `Regards,\n${advocateName}` : null,
  ];
  return lines.filter((l) => l !== null).join("\n");
}

/** Indian mobile numbers are stored however the advocate typed them;
 * WhatsApp needs digits with a country code. */
function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits.length >= 11 ? digits : null;
}

async function open(url: string, appName: string) {
  try {
    await Linking.openURL(url);
  } catch {
    Alert.alert(`Couldn't open ${appName}`, `Make sure ${appName} is installed, or use "More options".`);
  }
}

export function shareViaWhatsApp(text: string, phone?: string | null) {
  const number = toWhatsAppNumber(phone);
  // wa.me works whether or not WhatsApp is installed (falls back to the browser).
  return open(`https://wa.me/${number ?? ""}?text=${encodeURIComponent(text)}`, "WhatsApp");
}

export function shareViaEmail(text: string, subject: string, email?: string | null) {
  return open(
    `mailto:${email ?? ""}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`,
    "your email app"
  );
}

export function shareViaSms(text: string, phone?: string | null) {
  const separator = Platform.OS === "ios" ? "&" : "?";
  return open(`sms:${phone ?? ""}${separator}body=${encodeURIComponent(text)}`, "Messages");
}

export function shareViaSystem(text: string, title: string) {
  return Share.share({ title, message: text });
}
