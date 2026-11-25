import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { Eye, EyeOff } from "lucide-react";

import AuthShell from "@/components/auth/auth-shell";
import { registerRequest } from "@/lib/auth";

function SignupPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  // Tracks whether the password is shown as plain text.
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

      const token = res.token;
      if (!token) {
        throw new Error("Sign-up did not return a valid session token. Please try again.");
      }
      const user = res.user;
      // Keep the token so the new user is signed in right after signup.
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
            className="mb-2 block text-sm font-semibold text-[#58111A]"
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
            className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
          />
        </div>

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
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-semibold text-[#58111A]"
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

        <div>
          <label
            htmlFor="confirmPassword"
            className="mb-2 block text-sm font-semibold text-[#58111A]"
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
            className="w-full rounded-xl border border-[#EBD5D3] bg-[#FAF6F5] px-4 py-3 text-sm text-[#292929] outline-none transition focus:border-[#800020] focus:ring-1 focus:ring-[#800020]"
          />
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
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <p className="mt-7 text-center text-sm text-[#7A585B]">
        Already have an account?{" "}
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

export default SignupPage;