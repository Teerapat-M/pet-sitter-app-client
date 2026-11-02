"use client";

import { useRef, useState } from "react";
import LegalDocument from "@/components/legal/LegalDocument";
import LegalModal from "@/components/legal/LegalModal";
import { LEGAL_DOCUMENTS, shouldOpenLegalModal } from "@/lib/legal";

export default function TermsAndPrivacyLinks({ className }) {
  const [kind, setKind] = useState(null);
  const triggerRef = useRef(null);
  const doc = kind ? LEGAL_DOCUMENTS[kind] : null;

  function open(nextKind, event) {
    if (!shouldOpenLegalModal(event)) return;
    event.preventDefault();
    event.stopPropagation();
    triggerRef.current = event.currentTarget;
    setKind(nextKind);
  }

  return (
    <>
      <a
        href={LEGAL_DOCUMENTS.terms.href}
        className={className}
        aria-haspopup="dialog"
        onClick={(event) => open("terms", event)}
      >
        Terms
      </a>{" "}
      and{" "}
      <a
        href={LEGAL_DOCUMENTS.privacy.href}
        className={className}
        aria-haspopup="dialog"
        onClick={(event) => open("privacy", event)}
      >
        Privacy Policy
      </a>
      <LegalModal
        open={Boolean(doc)}
        title={doc?.title ?? ""}
        onClose={() => setKind(null)}
        returnFocusRef={triggerRef}
      >
        {doc ? <LegalDocument doc={doc} /> : null}
      </LegalModal>
    </>
  );
}
