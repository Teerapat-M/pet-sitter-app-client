import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { createElement, act } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import {
  LEGAL_APP_NAME,
  LEGAL_DOCUMENTS,
  LEGAL_EFFECTIVE_DATE,
  LEGAL_SUPPORT_EMAIL,
  isBodyScrollLocked,
  legalPlainText,
  lockBodyScroll,
  resetBodyScrollLock,
  shouldOpenLegalModal,
  unlockBodyScroll,
} from "./legal.js";

await register(new URL("../../scripts/jsx-loader.mjs", import.meta.url));

function installDom() {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/register",
    pretendToBeVisual: true,
  });
  const { window } = dom;
  for (const key of Object.getOwnPropertyNames(window)) {
    if (key in globalThis) continue;
    try {
      globalThis[key] = window[key];
    } catch {
      // Node 22 exposes getter-only globals such as navigator.
    }
  }
  globalThis.window = window;
  globalThis.document = window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  return dom;
}

installDom();

const { createRoot } = await import("react-dom/client");

async function setInputValue(element, value) {
  await act(async () => {
    const previous = element.value;
    const proto = Object.getPrototypeOf(element);
    Object.getOwnPropertyDescriptor(proto, "value").set.call(element, value);
    element._valueTracker?.setValue(previous);
    element.dispatchEvent(new window.Event("input", { bubbles: true }));
    element.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
}

async function click(element) {
  await act(async () => {
    element.dispatchEvent(
      new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
        view: window,
      }),
    );
  });
}

function mount(element) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(element);
  });
  return {
    container,
    unmount() {
      act(() => root.unmount());
      container.remove();
    },
  };
}

function formSnapshot(container) {
  return {
    name: container.querySelector('input[name="name"]').value,
    email: container.querySelector('input[name="email"]').value,
    phone: container.querySelector('input[name="phone"]').value,
    password: container.querySelector("#register-password").value,
    agreed: container.querySelector("#register-agree").checked,
  };
}

test("legal documents used by standalone pages keep terms and privacy copy", () => {
  const terms = legalPlainText(LEGAL_DOCUMENTS.terms);
  const privacy = legalPlainText(LEGAL_DOCUMENTS.privacy);

  assert.equal(LEGAL_DOCUMENTS.terms.title, "Terms of Service");
  assert.equal(LEGAL_DOCUMENTS.terms.href, "/terms-of-service");
  assert.equal(LEGAL_DOCUMENTS.privacy.title, "Privacy Policy");
  assert.equal(LEGAL_DOCUMENTS.privacy.href, "/privacy-policy");
  assert.match(terms, new RegExp(LEGAL_APP_NAME));
  assert.match(terms, new RegExp(LEGAL_EFFECTIVE_DATE));
  assert.match(terms, /1\. The Service/);
  assert.match(terms, /10\. Contact/);
  assert.match(privacy, /Information we collect/);
  assert.match(privacy, /Data Deletion/);
  assert.match(privacy, new RegExp(LEGAL_SUPPORT_EMAIL));
});

test("body scroll lock sets overflow hidden and restores it on unlock", () => {
  resetBodyScrollLock();
  document.body.style.overflow = "auto";
  document.documentElement.style.overflow = "scroll";

  const unlock = lockBodyScroll();
  assert.equal(document.body.style.overflow, "hidden");
  assert.equal(document.documentElement.style.overflow, "hidden");
  assert.equal(isBodyScrollLocked(), true);
  assert.equal(document.body.getAttribute("data-psp-scroll-lock"), "true");

  const nested = lockBodyScroll();
  assert.equal(document.body.style.overflow, "hidden");
  nested();
  assert.equal(document.body.style.overflow, "hidden");

  unlock();
  assert.equal(document.body.style.overflow, "auto");
  assert.equal(document.documentElement.style.overflow, "scroll");
  assert.equal(isBodyScrollLocked(), false);
  assert.equal(document.body.hasAttribute("data-psp-scroll-lock"), false);
  resetBodyScrollLock();
  document.body.style.removeProperty("overflow");
  document.documentElement.style.removeProperty("overflow");
});

test("primary clicks open the modal; modified clicks do not", () => {
  assert.equal(shouldOpenLegalModal({ button: 0 }), true);
  assert.equal(shouldOpenLegalModal({ button: 1 }), false);
  assert.equal(shouldOpenLegalModal({ button: 0, metaKey: true }), false);
  assert.equal(shouldOpenLegalModal({ button: 0, ctrlKey: true }), false);
});

test("standalone terms-of-service and privacy-policy pages still render", async () => {
  const { default: TermsPage } = await import("../app/terms-of-service/page.js");
  const { default: PrivacyPage } = await import("../app/privacy-policy/page.js");

  const termsHtml = renderToStaticMarkup(createElement(TermsPage));
  const privacyHtml = renderToStaticMarkup(createElement(PrivacyPage));

  assert.match(termsHtml, /Terms of Service/);
  assert.match(termsHtml, /1\. The Service/);
  assert.match(termsHtml, /Sitter\*/);
  assert.match(privacyHtml, /Privacy Policy/);
  assert.match(privacyHtml, /Information we collect/);
  assert.match(privacyHtml, /Data Deletion/);
  assert.match(privacyHtml, /href="\/data-deletion"/);
});

test("register form values and focus persist after Terms modal X, Esc, and backdrop close", async () => {
  resetBodyScrollLock();
  const { default: RegisterForm } = await import("../components/RegisterForm.js");
  const filled = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "0812345678",
    password: "Secret1!",
    agreed: true,
  };

  for (const method of ["x", "escape", "backdrop"]) {
    const view = mount(createElement(RegisterForm));

    await setInputValue(view.container.querySelector('input[name="name"]'), filled.name);
    await setInputValue(view.container.querySelector('input[name="email"]'), filled.email);
    await setInputValue(view.container.querySelector('input[name="phone"]'), filled.phone);
    await setInputValue(view.container.querySelector("#register-password"), filled.password);
    const checkbox = view.container.querySelector("#register-agree");
    if (!checkbox.checked) await click(checkbox);

    assert.deepEqual(formSnapshot(view.container), filled);

    const termsLink = [...view.container.querySelectorAll("a")].find(
      (link) => link.textContent === "Terms",
    );
    assert.ok(termsLink, "Terms link should exist");
    await click(termsLink);

    const dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog, `dialog should open before ${method} close`);
    assert.equal(dialog.getAttribute("aria-modal"), "true");
    assert.match(dialog.textContent, /Terms of Service/);
    assert.equal(document.body.style.overflow, "hidden");
    assert.equal(window.location.pathname, "/register");
    assert.ok(view.container.querySelector("form"), "form must stay mounted");
    assert.deepEqual(formSnapshot(view.container), filled);

    if (method === "x") {
      await click(dialog.querySelector('[aria-label="Close"]'));
    } else if (method === "escape") {
      await act(async () => {
        document.dispatchEvent(
          new window.KeyboardEvent("keydown", {
            key: "Escape",
            bubbles: true,
            cancelable: true,
          }),
        );
      });
    } else {
      await click(document.querySelector("[data-legal-backdrop]"));
    }

    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.notEqual(document.body.style.overflow, "hidden");
    assert.deepEqual(formSnapshot(view.container), filled);
    assert.equal(document.activeElement, termsLink);
    assert.equal(window.location.pathname, "/register");

    view.unmount();
  }

  const privacyView = mount(createElement(RegisterForm));
  await setInputValue(privacyView.container.querySelector('input[name="name"]'), filled.name);
  const privacyLink = [...privacyView.container.querySelectorAll("a")].find(
    (link) => link.textContent === "Privacy Policy",
  );
  await click(privacyLink);
  const privacyDialog = document.querySelector('[role="dialog"]');
  assert.ok(privacyDialog);
  assert.match(privacyDialog.textContent, /Privacy Policy/);
  assert.match(privacyDialog.textContent, /Information we collect/);
  await click(privacyDialog.querySelector('[aria-label="Close"]'));
  assert.equal(privacyView.container.querySelector('input[name="name"]').value, filled.name);
  assert.equal(document.activeElement, privacyLink);
  privacyView.unmount();
});

test("LoginForm renders LegalAuthNotice under the auth form", async () => {
  const { readFileSync } = await import("node:fs");
  const source = readFileSync(new URL("../components/LoginForm.js", import.meta.url), "utf8");
  assert.match(source, /LegalAuthNotice/);
});

test("LegalAuthNotice Terms link opens a dialog instead of navigating", async () => {
  const { default: LegalAuthNotice } = await import(
    "../components/legal/LegalAuthNotice.js"
  );
  const view = mount(createElement(LegalAuthNotice));
  const termsLink = [...view.container.querySelectorAll("a")].find(
    (link) => link.textContent === "Terms",
  );
  await click(termsLink);
  const dialog = document.querySelector('[role="dialog"]');
  assert.ok(dialog);
  assert.equal(window.location.pathname, "/register");
  await click(dialog.querySelector('[aria-label="Close"]'));
  assert.equal(document.activeElement, termsLink);
  view.unmount();
});
