import assert from "node:assert/strict";
import test from "node:test";
import {
  isOwnerProfileComplete,
  isValidEmail,
  validateProfile,
} from "../utils/validateProfile.js";

const completeOwner = {
  name: "Demo Owner",
  email: "owner@petsitter.demo",
  phone: "0812345678",
  idNumber: "1234567890123",
  dateOfBirth: "1990-01-15",
};

test("seeded @petsitter.demo email is a valid owner email", () => {
  assert.equal(isValidEmail("owner@petsitter.demo"), true);
  assert.equal(validateProfile(completeOwner).email, undefined);
  assert.equal(isOwnerProfileComplete(completeOwner), true);
});

test("email validation is not limited to .com", () => {
  assert.equal(isValidEmail("bell@example.co.th"), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("missing-tld@petsitter"), false);
  assert.equal(validateProfile({ ...completeOwner, email: "bad" }).email, "Enter a valid email address");
});
