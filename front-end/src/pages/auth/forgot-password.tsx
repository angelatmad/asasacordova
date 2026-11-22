import { useState } from "react";
import { Link } from "react-router";

import AuthShell from "@/components/auth/auth-shell";

import {
  forgotPasswordRequest,
  verifyResetCodeRequest,
  resetPasswordRequest,
} from "@/lib/auth";

type Step = "email" | "code" | "password";

function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("email");

  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSendCode(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      await forgotPasswordRequest(email);
      setStep("code");
      setMessage(
        "If an account exists for this email, a verification code has been sent."
      );
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to process your request."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleVerifyCode(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const result = await verifyResetCodeRequest(email, code);

      if (!result.reset_token) {
        throw new Error(
          "The server did not return a password reset token."
        );
      }

      setResetToken(result.reset_token);
      setStep("password");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "The verification code is invalid."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleResetPassword(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Your password must have at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Your passwords do not match.");
      return;
    }

    setIsLoading(true);

    try {
      await resetPasswordRequest(
        email,
        resetToken,
        password,
        confirmPassword
      );

      setMessage(
        "Your password has been updated. You can now sign in."
      );

      setStep("email");
      setEmail("");
      setCode("");
      setPassword("");
      setConfirmPassword("");
      setResetToken("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to reset your password."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Account Recovery"
      title="Forgot Password?"
      description="Follow the steps below to securely reset your account password."
    >
      {step === "email" && (
        <form onSubmit={handleSendCode} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-[#58111A]"
            >
              Registered Email Address
            </label>

            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Enter your email address"
              autoComplete="email"
              required
              className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#800020] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-60 shadow-md"
          >
            {isLoading ? "Sending..." : "Send Verification Code"}
          </button>
        </form>
      )}

      {step === "code" && (
        <form onSubmit={handleVerifyCode} className="space-y-5">
          <div>
            <label
              htmlFor="code"
              className="mb-2 block text-sm font-semibold text-[#58111A]"
            >
              Verification Code
            </label>

            <input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, ""))
              }
              placeholder="Enter the 6-digit code"
              required
              className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-center text-lg tracking-[0.4em] text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
            />

            <p className="mt-2 text-xs text-[#7A585B]">
              Check your email for the verification code.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full rounded-xl bg-[#800020] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-60 shadow-md"
          >
            {isLoading ? "Verifying..." : "Verify Code"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError("");
              setMessage("");
            }}
            className="w-full text-sm font-semibold text-[#800020] hover:underline"
          >
            Change Email Address
          </button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={handleResetPassword} className="space-y-5">
          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-[#58111A]"
            >
              New Password
            </label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your new password"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-[#58111A]"
            >
              Confirm New Password
            </label>

            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              placeholder="Confirm your new password"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#800020] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-60 shadow-md"
          >
            {isLoading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-4 rounded-xl bg-[#FFF0F2] p-3 text-sm leading-6 text-[#800020]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-[#FFF0F2] p-3 text-sm text-[#800020]">
          {error}
        </p>
      )}

      <p className="mt-7 text-center text-sm text-[#7A585B]">
        Remember your password?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#800020] hover:underline"
        >
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export default ForgotPasswordPage;