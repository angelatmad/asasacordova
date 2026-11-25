import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";

import { loginRequest } from "@/lib/auth";
import cclexImage from "@/assets/images/cclex.jpeg";

function LoginPage() {
  const navigate = useNavigate();
  // ProtectedRoute stores the page the guest wanted, so login can return there.
  const location = useLocation();
  const redirectState = location.state as {
    from?: { pathname?: string; search?: string; hash?: string };
  } | null;
  const redirectPath = redirectState?.from?.pathname
    ? `${redirectState.from.pathname}${redirectState.from.search ?? ""}${redirectState.from.hash ?? ""}`
    : "/home";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // Tracks whether the password is shown as plain text.
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
      const token = res.token;
      if (!token) {
        throw new Error("Sign-in did not return a valid session token. Please try again.");
      }
      const user = res.user;
      // Keep the token so protected pages know the user is signed in.
      localStorage.setItem("asc_token", token);
      localStorage.setItem("asc_user_email", user?.email || email);
      const userName = user?.name || email.split("@")[0].replace(/[^a-zA-Z0-9]/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()) || "Cordova Explorer";
      localStorage.setItem("asc_user_name", userName);
      navigate(redirectPath, { replace: true });
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
    <div className="min-h-screen bg-[#FAF6F5] lg:grid lg:grid-cols-2">
      {/* The maroon photo panel is hidden on narrow screens so the form stays clear. */}
      <aside className="relative hidden overflow-hidden bg-[#58111A] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <img
          src={cclexImage}
          alt="Cebu-Cordova Link Expressway"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#58111A]/75 via-[#58111A]/45 to-[#58111A]/95" />

        <div className="relative z-10">
          <Link
            to="/"
            className="font-display text-2xl font-bold tracking-wide text-white"
          >
            Asa sa <span className="text-[#F2DCDA]">Cordova</span>
          </Link>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.3em] text-[#F2DCDA]">
            Discover • Explore • Experience
          </p>
        </div>

        <div className="relative z-10 max-w-md">
          <h2 className="font-display text-4xl font-semibold leading-tight text-white">
            Your Cordova adventure starts here.
          </h2>
          <p className="mt-5 text-sm leading-7 text-white/85">
            Discover coastal destinations, local culture, and traveler stories
            across the municipality of Cordova, Cebu.
          </p>
          <Link
            to="/destinations"
            className="mt-8 inline-flex rounded-full border border-white/50 px-6 py-3 text-sm font-bold text-white transition hover:bg-white/20"
          >
            Explore as a Guest
          </Link>
        </div>
      </aside>

      <main className="flex min-h-screen items-center justify-center px-4 py-12 sm:px-8 lg:min-h-0">
        <div className="w-full max-w-md rounded-3xl border border-[#EBD5D3] bg-white p-8 shadow-2xl sm:p-10">
          <div className="mb-8 text-center">
            <span className="inline-block rounded-full bg-[#FFF0F2] px-4 py-1 text-xs font-bold uppercase tracking-[0.25em] text-[#800020] mb-3">
              Welcome Back
            </span>

            <h1 className="font-display text-3xl font-semibold text-[#58111A] sm:text-4xl">
              Sign In
            </h1>

            <p className="mt-2.5 text-sm leading-6 text-[#7A585B]">
              Sign in to your account and continue exploring.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-[#58111A]"
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
                className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
              />
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-sm font-semibold text-[#58111A]"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#800020] hover:underline"
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
                  className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 pr-16 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
                />

                {/* Switches the input between hidden and visible; the label helps screen readers. */}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-[#800020]"
                >
                  {showPassword ? (
                    <EyeOff size={18} strokeWidth={2} aria-hidden="true" />
                  ) : (
                    <Eye size={18} strokeWidth={2} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p className="rounded-xl bg-[#FFF0F2] p-3 text-sm text-[#800020]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-[#800020] px-5 py-3.5 text-sm font-semibold text-white transition hover:bg-[#58111A] disabled:opacity-60 shadow-md"
            >
              {isLoading ? "Signing In..." : "Sign In"}
            </button>
          </form>

          <p className="mt-7 text-center text-sm text-[#7A585B]">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-semibold text-[#800020] hover:underline"
            >
              Create Account
            </Link>
          </p>

          <div className="mt-6 border-t border-[#EBD5D3] pt-6 text-center">
            <Link
              to="/"
              className="text-xs font-semibold text-[#7A585B] hover:text-[#800020]"
            >
              Back to home
            </Link>
            <p className="mt-3 text-xs text-[#7A585B]">
              Municipality of Cordova, Cebu 6017 • Official Tourism Portal
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default LoginPage;
