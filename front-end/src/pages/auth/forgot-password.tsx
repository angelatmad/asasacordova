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
              className="mb-2 block text-sm font-semibold text-[#292929]"
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
              className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#C96B6B] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:opacity-60 shadow-md"
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
              className="mb-2 block text-sm font-semibold text-[#292929]"
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
              className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 text-center text-lg tracking-[0.4em] text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
            />

            <p className="mt-2 text-xs text-[#716767]">
              Check your email for the verification code.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className="w-full rounded-xl bg-[#C96B6B] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:opacity-60 shadow-md"
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
            className="w-full text-sm font-semibold text-[#C96B6B] hover:underline"
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
              className="mb-2 block text-sm font-semibold text-[#292929]"
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
              className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-[#292929]"
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
              className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-xl bg-[#C96B6B] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:opacity-60 shadow-md"
          >
            {isLoading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      )}

      {message && (
        <p className="mt-4 rounded-xl bg-[#FCEBEC] p-3 text-sm leading-6 text-[#C96B6B]">
          {message}
        </p>
      )}

      {error && (
        <p className="mt-4 rounded-xl bg-[#FCEBEC] p-3 text-sm text-[#C96B6B]">
          {error}
        </p>
      )}

      <p className="mt-7 text-center text-sm text-[#716767]">
        Remember your password?{" "}
        <Link
          to="/login"
          className="font-semibold text-[#C96B6B] hover:underline"
        >
          Sign In
        </Link>
      </p>
    </AuthShell>
  );
}

export default ForgotPasswordPage;