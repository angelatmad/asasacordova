import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";

// Use the configured API URL so the check works in dev and production.
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Remove every saved login detail when Laravel says the session is invalid.
function clearSession(): void {
  localStorage.removeItem("asc_token");
  localStorage.removeItem("asc_user_email");
  localStorage.removeItem("asc_user_name");
  localStorage.removeItem("asc_user_role");
}

// Blocks guest pages from users who are not signed in.
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  // null means "still checking", so we neither show the page nor redirect yet.
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  // Saved in the redirect so login can send the user back to this page.
  const location = useLocation();

  // The backend checks the token because localStorage alone is not trusted.
  useEffect(() => {
    // Prevent a late response from updating a component that is already gone.
    let isMounted = true;

    // Ask Laravel if the saved token still belongs to a valid user.
    async function verifyAuth() {
      const token = localStorage.getItem("asc_token");
      if (!token) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      try {
        // Bearer token tells the API which user is making the request.
        const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const user = await response.json();
          if (user && user.email) {
            // Cache profile details for the navbar and other pages.
            localStorage.setItem("asc_user_email", user.email);
            localStorage.setItem("asc_user_name", user.name || "Cordova Explorer");
            // The role is saved too, so navigation can show admin links when allowed.
            localStorage.setItem("asc_user_role", user.role || "user");
            if (isMounted) setIsAuthenticated(true);
            return;
          }
        }

        // 401/403 means the token was rejected, so clearing prevents a redirect loop.
        if (response.status === 401 || response.status === 403) {
          clearSession();
          if (isMounted) setIsAuthenticated(false);
          return;
        }

        // Other failures (like a short outage) keep the user signed in.
        console.error("Auth verification returned", response.status);
        if (isMounted) setIsAuthenticated(true);
      } catch (err) {
        // A network error should not log out a user who is probably still valid.
        console.error("Auth verification failed", err);
        if (isMounted) setIsAuthenticated(true);
      }
    }

    // Run the check once when this guard first appears.
    verifyAuth();

    // Cleanup marks the effect as finished.
    return () => {
      isMounted = false;
    };
  }, []);

  // Show a spinner before the check finishes.
  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAF6F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#800020] border-t-transparent" />
          <p className="text-sm font-semibold text-[#7A585B]">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Guests go to login; state remembers the page they tried to open.
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Only verified users reach the protected page.
  return <>{children}</>;
}
