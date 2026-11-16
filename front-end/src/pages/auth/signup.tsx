import { useState } from "react";
import { Link, useNavigate } from "react-router";

import AuthShell from "@/components/auth/auth-shell";
import { registerRequest } from "@/lib/auth";

function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

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
      const res = await registerRequest(
        name,
        email,
        password,
        confirmPassword
      );

      const token = (res as any)?.token || "demo_token_active";
      const user = (res as any)?.user;
      localStorage.setItem("asc_token", token);
      localStorage.setItem("asc_user_email", user?.email || email);
      localStorage.setItem("asc_user_name", user?.name || name);

      navigate("/home", {
        replace: true,
        state: {
          message: "Your account has been created and you are now signed in.",
        },
      });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create your account."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Join Our Community"
      title="Create Account"
      description="Create your account to discover and explore the beautiful places."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block text-sm font-semibold text-[#292929]"
          >
            Full Name
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Enter your full name"
            autoComplete="name"
            required
            className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
          />
        </div>

        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-semibold text-[#292929]"
          >
            Email Address
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

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-[#292929]"
          >
            Password
          </label>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              autoComplete="new-password"
              required
              className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 pr-16 text-sm text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#C96B6B]"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-[#292929]"
          >
            Confirm Password
          </label>

          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(event) =>
              setConfirmPassword(event.target.value)
            }
            placeholder="Re-enter your password"
            autoComplete="new-password"
            required
            className="w-full rounded-xl border border-[#F1E5DF] bg-[#FFFAF8] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#C96B6B] focus:ring-1 focus:ring-[#C96B6B]"
          />
        </div>

        {error && (
          <p className="rounded-xl bg-[#FCEBEC] p-3 text-sm text-[#C96B6B]">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-xl bg-[#C96B6B] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#292929] disabled:opacity-60 shadow-md"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#716767]">
        Already have an account?{" "}
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

export default SignupPage;