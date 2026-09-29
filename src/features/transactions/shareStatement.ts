import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Linking, Platform, Share } from "react-native";
import { alertMessage } from "@/shared/lib/alert";
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

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Same statement, laid out as a printable HTML document for the PDF. */
export function buildStatementHtml({
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

  const summaryRows = range
    ? [
        ["Received in this period", formatINR(periodReceived)],
        ["Outstanding balance (overall)", formatINR(overallPending)],
      ]
    : [
        ["Total fees", formatINR(overallTotal)],
        ["Received", formatINR(overallReceived)],
        ["Balance due", formatINR(overallPending)],
      ];

  const rows = [...periodFees]
    .sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
    .map(
      (t) => `<tr>
        <td>${escapeHtml(formatDay(t.transaction_date))}</td>
        <td>${escapeHtml(t.category)}${!caseTitle && t.cases?.title ? ` <span class="muted">(${escapeHtml(t.cases.title)})</span>` : ""}</td>
        <td class="status ${t.status}">${t.status === "pending" ? "Due" : "Received"}</td>
        <td class="amount">${escapeHtml(formatINR(Number(t.amount)))}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #0F172A; padding: 32px; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  .subtitle { color: #475569; font-size: 13px; margin: 0 0 24px; }
  .summary { display: flex; gap: 24px; margin-bottom: 28px; border-top: 1px solid #E2E8F0; border-bottom: 1px solid #E2E8F0; padding: 16px 0; }
  .summary div { flex: 1; }
  .summary .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; }
  .summary .value { font-size: 18px; font-weight: 600; margin-top: 2px; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; }
  th { text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: #64748B; padding: 8px 4px; border-bottom: 1px solid #CBD5E1; }
  td { padding: 10px 4px; border-bottom: 1px solid #F1F5F9; }
  td.amount { text-align: right; font-variant-numeric: tabular-nums; }
  td.status { text-transform: capitalize; }
  td.status.pending { color: #B3261E; }
  .muted { color: #94A3B8; font-size: 12px; }
  .empty { color: #64748B; padding: 24px 0; text-align: center; }
  .signoff { margin-top: 32px; font-size: 13px; }
</style>
</head>
<body>
  <h1>Payment statement — ${escapeHtml(clientName)}</h1>
  <p class="subtitle">
    ${caseTitle ? `Case: ${escapeHtml(caseTitle)}${caseNumber ? ` (${escapeHtml(caseNumber)})` : ""} · ` : ""}
    Period: ${escapeHtml(periodLabel ?? "Complete transaction history")} ·
    ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
  </p>

  <div class="summary">
    ${summaryRows.map(([label, value]) => `<div><div class="label">${escapeHtml(label)}</div><div class="value">${escapeHtml(value)}</div></div>`).join("")}
  </div>

  ${
    periodFees.length === 0
      ? `<p class="empty">${range ? "No fee entries in this period." : "No fee entries yet."}</p>`
      : `<table>
          <thead><tr><th>Date</th><th>Category</th><th>Status</th><th class="amount">Amount</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>`
  }

  ${advocateName ? `<p class="signoff">Regards,<br />${escapeHtml(advocateName)}</p>` : ""}
</body>
</html>`;
}

/** Generates the statement as a PDF and hands it to the OS to save or
 * share. On web, expo-print opens the browser's print dialog (the user
 * chooses "Save as PDF"); on native it saves a file and opens the share
 * sheet, since there's no equivalent print dialog to fall back on. */
export async function downloadStatementPdf(input: StatementInput, title: string) {
  const html = buildStatementHtml(input);
  try {
    if (Platform.OS === "web") {
      await Print.printToFileAsync({ html });
      return;
    }
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: title, UTI: "com.adobe.pdf" });
    }
  } catch (err) {
    alertMessage("Couldn't create PDF", err instanceof Error ? err.message : "Something went wrong");
  }
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
    alertMessage(`Couldn't open ${appName}`, `Make sure ${appName} is installed, or use "More options".`);
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
