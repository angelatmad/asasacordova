import { useEffect, useState, type ReactNode } from "react";
import { Navigate, useLocation } from "react-router";

import { API_BASE_URL } from "@/lib/api-config";

interface AdminRouteProps {
  children: ReactNode;
}

// This guard only lets signed-in admins see the pages inside it.
export function AdminRoute({ children }: AdminRouteProps) {
  // "loading" delays the result until the backend confirms who the user is.
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated" | "forbidden">("loading");
  // The path also lets us remember where the user wanted to go before login.
  const location = useLocation();

  // localStorage can be edited by a user, so the server must confirm the role.
  useEffect(() => {
    // This flag stops an old request from updating state after unmount.
    let isMounted = true;

    // Ask Laravel whether the saved token is valid and whether the user is an admin.
    async function verifyAdmin() {
      const token = localStorage.getItem("asc_token");

      // No token means the visitor is not logged in.
      if (!token) {
        localStorage.removeItem("asc_user_role");
        if (isMounted) setStatus("unauthenticated");
        return;
      }

      try {
        // The Bearer token tells the API which user is making the request.
        const response = await fetch(`${API_BASE_URL}/api/auth/user`, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const payload = await response.json();
          // Laravel may wrap the user in a "user" key or return it directly.
          const user = payload && typeof payload === "object" && "user" in payload
            ? (payload as { user: Record<string, unknown> }).user
            : payload;

          if (user && typeof user === "object" && "email" in user) {
            const typedUser = user as {
              email: string;
              name?: string;
              role?: string;
            };
            // Cache profile details so the rest of the app can display them.
            localStorage.setItem("asc_user_email", typedUser.email);
            localStorage.setItem("asc_user_name", typedUser.name || "Cordova Explorer");
            localStorage.setItem("asc_user_role", typedUser.role || "user");

            if (isMounted) {
              // Only role "admin" may continue; normal users are sent away.
              setStatus(typedUser.role === "admin" ? "authenticated" : "forbidden");
            }
            return;
          }
        }
      } catch (error) {
        // A failed request is handled like an invalid session below.
        console.error("Admin auth verification failed", error);
      }

      // Clear saved login data so the next check starts fresh.
      localStorage.removeItem("asc_token");
      localStorage.removeItem("asc_user_email");
      localStorage.removeItem("asc_user_name");
      localStorage.removeItem("asc_user_role");
      if (isMounted) setStatus("unauthenticated");
    }

    verifyAdmin();

    // Cleanup avoids state updates after the component is removed.
    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  // While checking, hide the protected page and show a spinner.
  if (status === "loading") {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#FAF6F5]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#800020] border-t-transparent" />
          <p className="text-sm font-semibold text-[#7A585B]">Verifying session...</p>
        </div>
      </div>
    );
  }

  // Guests go to login, with the old page saved so they can return later.
  if (status === "unauthenticated") {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Logged-in non-admins go back to the visitor home page.
  if (status === "forbidden") {
    return <Navigate to="/home" replace />;
  }

  // Only verified admins reach the protected page.
  return <>{children}</>;
}
