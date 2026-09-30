import { LegalPage } from "@/features/legal/LegalPage";
import { DELETE_ACCOUNT_SECTIONS } from "@/features/legal/legalContent";

export default function DeleteAccountScreen() {
  return <LegalPage title="Delete your account & data" sections={DELETE_ACCOUNT_SECTIONS} />;
}
