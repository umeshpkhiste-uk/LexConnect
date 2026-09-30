import { LegalPage } from "@/features/legal/LegalPage";
import { TERMS_SECTIONS } from "@/features/legal/legalContent";

export default function TermsOfServiceScreen() {
  return <LegalPage title="Terms of Service" sections={TERMS_SECTIONS} />;
}
