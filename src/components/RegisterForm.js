"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { register } from "@/lib/api";
import { saveAuth } from "@/lib/auth";
import PasswordInput from "@/components/PasswordInput";
import { Card } from "@/components/ui/card";
import { validatePassword } from "@/utils/validatePassword";

export default function RegisterForm({
  title = "Create account",
  subtitle = "I want to...",
  loginHref = "/login/owner",
  loginPrompt = "Already have an account?",
  loginLabel = "Log in ›",
  initialMode = "owner",
}) {
  const router = useRouter();
  const [mode, setMode] = useState(initialMode);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const asSitter = mode === "sitter";

  function getInputClassName(field) {
    return `input ${errors[field] ? "input-error" : ""}`;
  }

  function applyRegisterApiError(message) {
    const lower = message.toLowerCase();

    if (lower.includes("phone") || message.includes("Phone number is already in use")) {
      setErrors((prev) => ({ ...prev, phone: message }));
      return;
    }

    if (lower.includes("email")) {
      setErrors((prev) => ({ ...prev, email: message }));
      return;
    }

    if (lower.includes("name")) {
      setErrors((prev) => ({ ...prev, name: message }));
      return;
    }

    setError(message);
  }

  function validateForm() {
    const newErrors = {};
    const trimmedName = name.trim();

    if (!trimmedName) {
      newErrors.name = "Name is required";
    } else if (trimmedName.length < 6 || trimmedName.length > 20) {
      newErrors.name = "Name must be between 6 and 20 characters";
    }

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!email.includes("@") || !email.toLowerCase().includes(".com")) {
      newErrors.email = "Email must be a valid format and contain @ and .com";
    }

    if (!phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^0\d{9}$/.test(phone.trim())) {
      newErrors.phone = "Phone number must be 10 digits and start with 0";
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      newErrors.password = passwordError;
    }

    if (!agreed) {
      newErrors.agreed = "Please agree to the Terms and Privacy Policy";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(Boolean);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const data = await register({
        name: name.trim(),
        email,
        phone,
        password,
        asSitter,
      });
      saveAuth(data, true);
      router.push(asSitter ? "/sitter/profile" : "/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Register failed";
      applyRegisterApiError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <header>
        <h2 className="text-h2">{title}</h2>
        <p className="mt-1 text-body-2 text-ink-400">{subtitle}</p>
      </header>

      <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="Account type">
        <Card
          as="button"
          type="button"
          interactive
          role="radio"
          aria-checked={mode === "owner"}
          onClick={() => setMode("owner")}
          className={`rounded-card border p-4 text-left ${
            mode === "owner" ? "border-primary bg-primary-50" : "border-line bg-surface"
          }`}
        >
          <p className="text-2xl" aria-hidden>🐶</p>
          <p className="mt-2 font-extrabold">Book care</p>
          <p className="text-caption text-ink-400">Pet owner</p>
        </Card>
        <Card
          as="button"
          type="button"
          interactive
          role="radio"
          aria-checked={mode === "sitter"}
          onClick={() => setMode("sitter")}
          className={`rounded-card border p-4 text-left ${
            mode === "sitter" ? "border-primary bg-primary-50" : "border-line bg-surface"
          }`}
        >
          <p className="text-2xl" aria-hidden>🐕</p>
          <p className="mt-2 font-extrabold">Offer care</p>
          <p className="text-caption text-ink-400">Sitter / walker</p>
        </Card>
      </div>

      <label className="flex flex-col gap-2">
        <span className="text-label text-ink-900">Full name</span>
        <input
          className={getInputClassName("name")}
          type="text"
          name="name"
          autoComplete="name"
          placeholder="Bell W."
          maxLength={20}
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            setErrors((prev) => ({ ...prev, name: "" }));
          }}
        />
        {errors.name ? <p className="text-caption text-danger">{errors.name}</p> : null}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label text-ink-900">Email</span>
        <input
          className={getInputClassName("email")}
          type="email"
          name="email"
          autoComplete="email"
          placeholder="bell@example.com"
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setErrors((prev) => ({ ...prev, email: "" }));
          }}
        />
        {errors.email ? <p className="text-caption text-danger">{errors.email}</p> : null}
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-label text-ink-900">Phone</span>
        <input
          className={getInputClassName("phone")}
          type="tel"
          name="phone"
          inputMode="numeric"
          autoComplete="tel"
          placeholder="0812345678"
          maxLength={10}
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value.replace(/\D/g, "").slice(0, 10));
            setErrors((prev) => ({ ...prev, phone: "" }));
            setError("");
          }}
        />
        {errors.phone ? <p className="text-caption text-danger">{errors.phone}</p> : null}
      </label>

      <div className="flex flex-col gap-2">
        <label htmlFor="register-password" className="text-label text-ink-900">
          Password
        </label>
        <PasswordInput
          id="register-password"
          autoComplete="new-password"
          placeholder="Create your password"
          error={Boolean(errors.password)}
          value={password}
          onChange={(event) => {
            setPassword(event.target.value);
            setErrors((prev) => ({ ...prev, password: "" }));
          }}
        />
        {errors.password ? <p className="text-caption text-danger">{errors.password}</p> : null}
      </div>

      <label className="flex items-start gap-3 text-body-2 text-ink-600">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => {
            setAgreed(event.target.checked);
            setErrors((prev) => ({ ...prev, agreed: "" }));
          }}
          className="mt-1 size-4 accent-primary"
        />
        <span>
          I agree to the{" "}
          <Link href="/terms-of-service" className="font-bold text-primary">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy-policy" className="font-bold text-primary">
            Privacy Policy
          </Link>
        </span>
      </label>
      {errors.agreed ? <p className="text-caption text-danger">{errors.agreed}</p> : null}

      {error && !errors.email && !errors.phone ? (
        <p className="text-center text-caption text-danger">{error}</p>
      ) : null}

      <button className="btn btn-primary w-full" type="submit" disabled={loading}>
        {loading ? "Creating account..." : "Create account"}
      </button>

      <p className="text-center text-body-2 text-ink-600">
        {loginPrompt}{" "}
        <Link href={loginHref} className="font-bold text-primary">
          {loginLabel}
        </Link>
      </p>
    </form>
  );
}
