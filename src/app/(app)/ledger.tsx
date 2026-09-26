import { useLocalSearchParams } from "expo-router";
import { LedgerView } from "@/features/transactions/LedgerView";

/** /ledger?clientId=…[&caseId=…] — a client's transactions, optionally for one case. */
export default function LedgerScreen() {
  const { clientId, caseId } = useLocalSearchParams<{ clientId: string; caseId?: string }>();
  return <LedgerView clientId={clientId} caseId={caseId || undefined} variant="screen" />;
}
