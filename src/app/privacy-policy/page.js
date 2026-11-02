import LegalDocument from "@/components/legal/LegalDocument";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

export const metadata = {
  title: "Privacy Policy | Pet Sitter App",
  description: "Privacy Policy for Sitter* pet sitting platform",
};

export default function PrivacyPolicyPage() {
  const doc = LEGAL_DOCUMENTS.privacy;
  return (
    <LegalPageLayout title={doc.title}>
      <LegalDocument doc={doc} />
    </LegalPageLayout>
  );
}
