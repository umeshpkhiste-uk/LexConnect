import { LegalPage } from "@/features/legal/LegalPage";
import { PRIVACY_SECTIONS } from "@/features/legal/legalContent";

export default function PrivacyPolicyScreen() {
  return <LegalPage title="Privacy Policy" sections={PRIVACY_SECTIONS} />;
}
