import { API_BASE_URL } from "@/lib/api-config";


// Basic signed-in user data returned by Laravel. "role" decides admin access.
export type AuthUser = {
  id?: number;
  name?: string;
  email?: string;
  role?: string;
};

// Common response shape for Laravel auth endpoints.
type ApiResponse = {
  message?: string;
  reset_token?: string;
  // Login/register return a Sanctum token that the app saves for later requests.
  token?: string;
  // The user object lets the UI greet the person and check the role.
  user?: AuthUser | null;
};

export function clearAuthSession(): void {
  localStorage.removeItem("asc_token");
  localStorage.removeItem("asc_user_email");
  localStorage.removeItem("asc_user_name");
  localStorage.removeItem("asc_user_role");
  localStorage.removeItem("asc_user_id");
  localStorage.removeItem("asc_is_admin");
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearAuthSession();
        return false;
      }
      return true;
    }

    const user = (await response.json().catch(() => null)) as AuthUser | null;
    if (!user || typeof user.email !== "string" || user.email === "") {
      clearAuthSession();
      return false;
    }

    localStorage.setItem("asc_user_email", user.email);
    localStorage.setItem("asc_user_name", user.name || "Cordova Explorer");
    localStorage.setItem("asc_user_role", user.role || "user");
    return true;
  } catch {
    return true;
  }
}

// Shared POST helper for auth calls. It sends JSON to Laravel and turns a
// failed response into an Error the auth pages can display.
async function authRequest(
  endpoint: string,
  data: Record<string, string>
): Promise<ApiResponse> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      credentials: "include",
      // Form values are converted to the JSON Laravel expects.
      body: JSON.stringify(data),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    // Laravel validation errors include a message; fall back if it is missing.
    throw new Error(
      result.message ?? "Something went wrong. Please try again."
    );
  }

  return result;
}

// Exchange email and password for a Laravel token and user record.
export function loginRequest(
  email: string,
  password: string
) {
  return authRequest("/api/auth/login", {
    email,
    password,
  });
}

// Create a new account; password_confirmation must match password on the server.
export function registerRequest(
  name: string,
  email: string,
  password: string,
  passwordConfirmation: string
) {
  return authRequest("/api/auth/register", {
    name,
    email,
    password,
    password_confirmation: passwordConfirmation,
  });
}

// Ask Laravel to send a reset code to the given email.
export function forgotPasswordRequest(email: string) {
  return authRequest("/api/auth/forgot-password", {
    email,
  });
}

// Check the 6-digit code before allowing a password change.
export function verifyResetCodeRequest(
  email: string,
  code: string
) {
  return authRequest("/api/auth/verify-reset-code", {
    email,
    code,
  });
}

// Send the verified token and new password to Laravel.
export function resetPasswordRequest(
  email: string,
  resetToken: string,
  password: string,
  passwordConfirmation: string
) {
  return authRequest("/api/auth/reset-password", {
    email,
    reset_token: resetToken,
    password,
    password_confirmation: passwordConfirmation,
  });
}

// Tell Laravel to delete the current token. The UI clears local state separately.
export async function logoutRequest() {
  const token = localStorage.getItem("asc_token");
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        // This protected route needs the token to know which session to end.
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    // The user can still be signed out locally even if the server is offline.
    console.error("Logout request error", err);
  }
}
