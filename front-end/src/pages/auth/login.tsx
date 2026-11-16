import { useState } from "react";
import { Link, useNavigate } from "react-router";

import AuthShell from "@/components/auth/auth-shell";
import { loginRequest } from "@/lib/auth";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await loginRequest(email, password);
      const token = (res as any)?.token || "demo_token_active";
      const user = (res as any)?.user;
      localStorage.setItem("asc_token", token);
      localStorage.setItem("asc_user_email", user?.email || email);
      const userName = user?.name || email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Cordova Explorer";
      localStorage.setItem("asc_user_name", userName);
      navigate("/home", { replace: true });
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthShell
      eyebrow="Welcome Back"
      title="Sign In"
      description="Sign in to your account and continue exploring."
    >
      <form onSubmit={handleSubmit} className="space-y-5">
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
          <div className="mb-2 flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-semibold text-[#292929]"
            >
              Password
            </label>

            <Link
              to="/forgot-password"
              className="text-xs font-semibold text-[#C96B6B] hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
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
          {isLoading ? "Signing In..." : "Sign In"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#716767]">
        Don't have an account?{" "}
        <Link
          to="/signup"
          className="font-semibold text-[#C96B6B] hover:underline"
        >
          Create Account
        </Link>
      </p>
    </AuthShell>
  );
}

export default LoginPage;