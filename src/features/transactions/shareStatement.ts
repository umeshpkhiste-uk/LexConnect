import { Alert, Linking, Platform, Share } from "react-native";
import { formatINR } from "@/shared/lib/format";
import type { Transaction } from "./api";

type StatementInput = {
  clientName: string;
  caseTitle?: string | null;
  caseNumber?: string | null;
  advocateName?: string | null;
  transactions: (Transaction & { cases?: { title: string } | null })[];
  /** Fee position from the agreed fees; defaults to summing the entries. */
  totals?: { totalFees: number; received: number; pending: number };
};

function formatDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Plain-text statement for the client. Only fee (income) entries are
 * included — the advocate's own expenses are internal bookkeeping.
 */
export function buildStatement({ clientName, caseTitle, caseNumber, advocateName, transactions, totals }: StatementInput): string {
  const fees = transactions.filter((t) => t.type === "income");
  const received = totals?.received ?? fees.filter((t) => t.status === "completed").reduce((s, t) => s + Number(t.amount), 0);
  const pending = totals?.pending ?? fees.filter((t) => t.status === "pending").reduce((s, t) => s + Number(t.amount), 0);
  const totalFees = totals?.totalFees ?? received + pending;

  const lines = [
    `Payment statement — ${clientName}`,
    caseTitle ? `Case: ${caseTitle}${caseNumber ? ` (${caseNumber})` : ""}` : null,
    `Date: ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`,
    "",
    `Total fees: ${formatINR(totalFees)}`,
    `Received: ${formatINR(received)}`,
    `Balance due: ${formatINR(pending)}`,
    "",
    "Details:",
    ...(fees.length === 0
      ? ["No fee entries yet."]
      : [...fees]
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
