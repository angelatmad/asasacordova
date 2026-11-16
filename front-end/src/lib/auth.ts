
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

type ApiResponse = {
  message?: string;
  reset_token?: string;
};

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
      body: JSON.stringify(data),
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      result.message ?? "Something went wrong. Please try again."
    );
  }

  return result;
}

export function loginRequest(
  email: string,
  password: string
) {
  return authRequest("/api/auth/login", {
    email,
    password,
  });
}

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

export function forgotPasswordRequest(email: string) {
  return authRequest("/api/auth/forgot-password", {
    email,
  });
}

export function verifyResetCodeRequest(
  email: string,
  code: string
) {
  return authRequest("/api/auth/verify-reset-code", {
    email,
    code,
  });
}

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

export async function logoutRequest() {
  const token = localStorage.getItem("asc_token");
  if (!token) return;

  try {
    await fetch(`${API_BASE_URL}/api/auth/logout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
  } catch (err) {
    console.error("Logout request error", err);
  }
}
