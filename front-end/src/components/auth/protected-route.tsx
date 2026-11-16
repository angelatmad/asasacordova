import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    let isMounted = true;

    async function verifyAuth() {
      const token = localStorage.getItem("asc_token");
      if (!token) {
        if (isMounted) setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const user = await response.json();
          if (user && user.email) {
            localStorage.setItem("asc_user_email", user.email);
            localStorage.setItem("asc_user_name", user.name || "Cordova Explorer");
            if (isMounted) setIsAuthenticated(true);
            return;
          }
        }
      } catch (err) {
        console.error("Auth verification failed", err);
      }

      // If token invalid or request failed
      localStorage.removeItem("asc_token");
      localStorage.removeItem("asc_user_email");
      localStorage.removeItem("asc_user_name");
      if (isMounted) setIsAuthenticated(false);
    }

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  if (isAuthenticated === null) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FFFAF8]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#C96B6B] border-t-transparent" />
          <p className="text-sm font-semibold text-[#716767]">Verifying session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <>{children}</>;
}
