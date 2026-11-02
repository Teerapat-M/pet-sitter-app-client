import Link from "next/link";
import TermsAndPrivacyLinks from "@/components/legal/TermsAndPrivacyLinks";

/** ข้อความยอมรับ legal ใต้ฟอร์ม login/register (OAuth flow) */
export default function LegalAuthNotice() {
  return (
    <div className="space-y-1 text-center text-body-3 leading-relaxed text-gray-500">
      <p>
        By continuing, you agree to our{" "}
        <TermsAndPrivacyLinks className="whitespace-nowrap font-medium text-primary hover:underline" />
        .
      </p>
      <p>
        <Link
          href="/data-deletion"
          className="whitespace-nowrap font-medium text-primary hover:underline"
        >
          How to delete your data
        </Link>
      </p>
    </div>
  );
}
