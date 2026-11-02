import LegalDocument from "@/components/legal/LegalDocument";
import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LEGAL_DOCUMENTS } from "@/lib/legal";

export const metadata = {
  title: "Terms of Service | Pet Sitter App",
  description: "Terms of Service for Sitter* pet sitting platform",
};

export default function TermsOfServicePage() {
  const doc = LEGAL_DOCUMENTS.terms;
  return (
    <LegalPageLayout title={doc.title}>
      <LegalDocument doc={doc} />
    </LegalPageLayout>
  );
}
