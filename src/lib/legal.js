/** ค่าคงที่สำหรับหน้า legal — Meta App Review / Facebook Live */

export const LEGAL_APP_NAME = "Sitter*";
export const LEGAL_PROVIDER_NAME = "Pet Sitter App";
export const LEGAL_SUPPORT_EMAIL = "support@petsitter.app";
export const LEGAL_EFFECTIVE_DATE = "3 September 2026";
export const LEGAL_DELETION_DAYS = "30 business days";

const supportMail = {
  link: LEGAL_SUPPORT_EMAIL,
  href: `mailto:${LEGAL_SUPPORT_EMAIL}`,
};

export const LEGAL_DOCUMENTS = {
  terms: {
    kind: "terms",
    title: "Terms of Service",
    href: "/terms-of-service",
    blocks: [
      {
        type: "p",
        children: [{ strong: "Effective date:" }, ` ${LEGAL_EFFECTIVE_DATE}`],
      },
      {
        type: "p",
        children: `These Terms of Service ("Terms") govern your use of ${LEGAL_APP_NAME} operated by ${LEGAL_PROVIDER_NAME}. By creating an account or using the Service, you agree to these Terms.`,
      },
      {
        type: "section",
        heading: "1. The Service",
        children: [
          {
            type: "p",
            children: `${LEGAL_APP_NAME} is a marketplace that helps pet owners find and book pet sitters. We are not a pet-sitting employer; sitters are independent users who offer services through the platform.`,
          },
        ],
      },
      {
        type: "section",
        heading: "2. Accounts",
        children: [
          {
            type: "ul",
            items: [
              "You must provide accurate registration information.",
              "You are responsible for keeping your login credentials secure.",
              "You may register as a pet owner, a pet sitter, or both where supported.",
              "We may suspend or terminate accounts that violate these Terms or applicable law.",
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "3. Pet owners",
        children: [
          {
            type: "p",
            children:
              "Owners are responsible for accurate pet and booking information, timely payment, and communication with sitters. You must only book services you intend to use and comply with sitter requirements disclosed on the platform.",
          },
        ],
      },
      {
        type: "section",
        heading: "4. Pet sitters",
        children: [
          {
            type: "p",
            children:
              "Sitters are responsible for the care they provide, accurate availability and profile information, and completing bookings in good faith. Payout and bank details must be truthful and kept up to date where required by the Service.",
          },
        ],
      },
      {
        type: "section",
        heading: "5. Bookings and payments",
        children: [
          {
            type: "ul",
            items: [
              "Bookings are subject to sitter acceptance and platform rules.",
              "Prices and payment methods are shown during checkout.",
              "Card payments may be authorized at booking and captured according to platform policy.",
              "Refunds or disputes are handled according to booking status and applicable policies.",
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "6. Cancellations",
        children: [
          {
            type: "p",
            children:
              "Either party may cancel a booking according to the status and rules shown in the app. Repeated cancellations or misuse may result in account restrictions. Payment outcomes for cancelled bookings depend on timing and payment method.",
          },
        ],
      },
      {
        type: "section",
        heading: "7. Acceptable use",
        children: [
          { type: "p", children: "You agree not to:" },
          {
            type: "ul",
            items: [
              "Use the Service for unlawful, fraudulent, or abusive purposes.",
              "Harass other users or misrepresent your identity.",
              "Attempt to bypass payments or safety features of the platform.",
              "Upload harmful, misleading, or infringing content.",
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "8. Limitation of liability",
        children: [
          {
            type: "p",
            children: `To the fullest extent permitted by law, ${LEGAL_PROVIDER_NAME} provides the Service "as is" and is not liable for indirect, incidental, or consequential damages arising from use of the platform or services arranged between users. Our total liability for any claim relating to the Service is limited to the amount you paid us for the relevant booking in the preceding twelve months, or the minimum amount permitted by law.`,
          },
        ],
      },
      {
        type: "section",
        heading: "9. Changes",
        children: [
          {
            type: "p",
            children:
              "We may update these Terms. Continued use after changes are posted constitutes acceptance of the updated Terms.",
          },
        ],
      },
      {
        type: "section",
        heading: "10. Contact",
        children: [
          {
            type: "p",
            children: ["Questions about these Terms: ", supportMail],
          },
        ],
      },
    ],
  },
  privacy: {
    kind: "privacy",
    title: "Privacy Policy",
    href: "/privacy-policy",
    blocks: [
      {
        type: "p",
        children: [{ strong: "Effective date:" }, ` ${LEGAL_EFFECTIVE_DATE}`],
      },
      {
        type: "p",
        children: `This Privacy Policy describes how ${LEGAL_PROVIDER_NAME} ("we", "us") collects, uses, and protects your information when you use ${LEGAL_APP_NAME} (the "Service").`,
      },
      {
        type: "section",
        heading: "1. Who we are",
        children: [
          {
            type: "p",
            children: [
              `${LEGAL_APP_NAME} is a platform that connects pet owners with pet sitters for booking and payment. For privacy-related requests, contact us at `,
              supportMail,
              ".",
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "2. Information we collect",
        children: [
          {
            type: "ul",
            items: [
              [
                { strong: "Account data:" },
                " name, email address, phone number, profile photo, and password (stored securely by our authentication provider).",
              ],
              [
                { strong: "Social login (OAuth):" },
                " when you sign in with Google or Facebook, we receive basic profile information (such as name, email, and profile picture) as permitted by those providers.",
              ],
              [
                { strong: "Pet information:" },
                " pet names, types, photos, and related details you provide.",
              ],
              [
                { strong: "Booking data:" },
                " dates, times, messages, booking status, and transaction references.",
              ],
              [
                { strong: "Payment data:" },
                " payment method type and transaction status. Card details are processed by Stripe; we do not store full card numbers on our servers.",
              ],
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "3. How we use your information",
        children: [
          {
            type: "ul",
            items: [
              "Create and manage your account (registration and login).",
              "Authenticate you, including social sign-in.",
              "Facilitate bookings between pet owners and pet sitters.",
              "Process payments and payouts.",
              "Communicate about bookings, account security, and support.",
              "Improve the Service and comply with legal obligations.",
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "4. Third-party services",
        children: [
          {
            type: "p",
            children: "We use trusted third parties to operate the Service:",
          },
          {
            type: "ul",
            items: [
              [{ strong: "Supabase" }, " — authentication and secure storage."],
              [{ strong: "Stripe" }, " — payment processing."],
              [{ strong: "Google" }, " — optional sign-in (OAuth)."],
              [{ strong: "Meta / Facebook" }, " — optional sign-in (OAuth)."],
            ],
          },
          {
            type: "p",
            children:
              "These providers process data according to their own privacy policies. We only share what is necessary to provide the Service.",
          },
        ],
      },
      {
        type: "section",
        heading: "5. Cookies and session storage",
        children: [
          {
            type: "p",
            children:
              'We use browser storage to keep you signed in (for example, authentication tokens and your "Remember me" preference). These are essential for login and account security. We do not use third-party advertising cookies.',
          },
        ],
      },
      {
        type: "section",
        heading: "6. Your rights",
        children: [
          {
            type: "p",
            children: "Depending on your location, you may have the right to:",
          },
          {
            type: "ul",
            items: [
              "Access the personal data we hold about you.",
              "Correct inaccurate information in your profile.",
              "Request deletion of your account and associated data.",
              "Withdraw consent where processing is based on consent.",
            ],
          },
          {
            type: "p",
            children: [
              "To exercise these rights, email ",
              supportMail,
              " or follow our ",
              { link: "Data Deletion", href: "/data-deletion" },
              ` instructions. We aim to respond within ${LEGAL_DELETION_DAYS}.`,
            ],
          },
        ],
      },
      {
        type: "section",
        heading: "7. Data retention",
        children: [
          {
            type: "p",
            children:
              "We retain your information while your account is active and as needed to provide the Service, resolve disputes, and meet legal requirements. When you request deletion, we remove or anonymize your data within a reasonable period, except where we must keep certain records by law.",
          },
        ],
      },
      {
        type: "section",
        heading: "8. Changes to this policy",
        children: [
          {
            type: "p",
            children:
              "We may update this Privacy Policy from time to time. We will post the revised version on this page and update the effective date above.",
          },
        ],
      },
      {
        type: "section",
        heading: "9. Contact",
        children: [
          {
            type: "p",
            children: ["Questions about this Privacy Policy: ", supportMail],
          },
        ],
      },
    ],
  },
};

export function legalPlainText(doc) {
  const parts = [];

  function walkInline(value) {
    if (typeof value === "string") {
      parts.push(value);
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walkInline);
      return;
    }
    if (value?.strong) parts.push(value.strong);
    if (value?.link) parts.push(value.link);
  }

  function walkBlock(block) {
    if (!block) return;
    if (block.type === "p") walkInline(block.children);
    else if (block.type === "ul" || block.type === "ol") {
      (block.items || []).forEach(walkInline);
    } else if (block.type === "section") {
      parts.push(block.heading);
      (block.children || []).forEach(walkBlock);
    }
  }

  (doc?.blocks || []).forEach(walkBlock);
  return parts.join(" ");
}

/** Primary click opens the modal; modified clicks may still open the standalone page. */
export function shouldOpenLegalModal(event) {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

const SCROLL_LOCK_ATTR = "data-psp-scroll-lock";
let scrollLockCount = 0;
let savedOverflow = null;

/** Test hook so each case starts from an unlocked body. */
export function resetBodyScrollLock() {
  scrollLockCount = 0;
  savedOverflow = null;
}

export function isBodyScrollLocked(doc = globalThis.document) {
  return (
    scrollLockCount > 0 &&
    doc?.body?.style?.overflow === "hidden" &&
    doc.body.getAttribute(SCROLL_LOCK_ATTR) === "true"
  );
}

/** Lock html+body overflow. Nested calls share one lock; unlock restores the last saved value. */
export function lockBodyScroll(doc = globalThis.document) {
  if (!doc?.body || !doc.documentElement) return () => {};
  const body = doc.body;
  const html = doc.documentElement;
  if (scrollLockCount === 0) {
    savedOverflow = {
      body: body.style.getPropertyValue("overflow"),
      html: html.style.getPropertyValue("overflow"),
    };
    body.style.setProperty("overflow", "hidden");
    html.style.setProperty("overflow", "hidden");
    body.setAttribute(SCROLL_LOCK_ATTR, "true");
  }
  scrollLockCount += 1;
  return () => unlockBodyScroll(doc);
}

export function unlockBodyScroll(doc = globalThis.document) {
  if (!doc?.body || !doc.documentElement) return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount > 0) return;
  const body = doc.body;
  const html = doc.documentElement;
  const prev = savedOverflow ?? { body: "", html: "" };
  if (prev.body) body.style.setProperty("overflow", prev.body);
  else body.style.removeProperty("overflow");
  if (prev.html) html.style.setProperty("overflow", prev.html);
  else html.style.removeProperty("overflow");
  body.removeAttribute(SCROLL_LOCK_ATTR);
  savedOverflow = null;
}
