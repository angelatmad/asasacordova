import "@/styles/global.css";

import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
  Outlet,
  useLocation,
} from "react-router";

import HomePage from "@/pages/guest/home";
import DestinationsPage from "@/pages/guest/destinations";
import DestinationDetailsPage from "@/pages/guest/destination-details";
import CultureEventsPage from "@/pages/guest/culture-events";
import CentralMapPage from "@/pages/guest/map-overview";
import FavoritesPage from "@/pages/guest/favorites";
import VisitedPage from "@/pages/guest/visited";
import { AscAiAssistant } from "@/components/common/asc-ai";

import LoginPage from "@/pages/auth/login";
import SignupPage from "@/pages/auth/signup";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import AboutPage from "@/pages/guest/about";
import ProfilePage from "@/pages/guest/profile";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminRoute } from "@/components/auth/admin-route";
import { AdminLayout } from "@/components/admin/AdminLayout";

import AdminDashboardPage from "@/pages/admin/dashboard";
import AdminDestinationsPage from "@/pages/admin/destinations";
import AdminEventsPage from "@/pages/admin/events";
import AdminUsersPage from "@/pages/admin/users";
import AdminReviewsPage from "@/pages/admin/reviews";
import AdminAnalyticsPage from "@/pages/admin/analytics";
import AdminProfilePage from "@/pages/admin/profile";

// Pages where the floating AI chat should not appear.
const AUTH_PATHS = ["/login", "/signup", "/forgot-password"];
// Admin pages also hide the guest AI chat.
const ADMIN_PATHS = ["/admin"];

// The AI chat is only available to logged-in users, never on the auth pages.
function AuthOnlyAssistant() {
  const { pathname } = useLocation();
  // A saved token means the user is signed in.
  const isLoggedIn = Boolean(localStorage.getItem("asc_token"));

  // Check admin pages too, including nested routes like /admin/events.
  const isAdminPath = ADMIN_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isLoggedIn || AUTH_PATHS.includes(pathname) || isAdminPath) return null;

  return <AscAiAssistant />;
}

// One guard wraps every member page, so we do not repeat it on each route.
function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <Outlet />
    </ProtectedRoute>
  );
}

function ScrollManager() {
  const { pathname, hash } = useLocation();

  useLayoutEffect(() => {
    if (hash) {
      const targetId = decodeURIComponent(hash.slice(1));
      const target = document.getElementById(targetId);

      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      } else {
        // "instant" jumps to the top right away after navigation.
        window.scrollTo({
          top: 0,
          behavior: "instant",
        });
      }

      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [pathname, hash]);

  return null;
}

export function App() {
  return (
    <BrowserRouter useTransitions={false}>
      <ScrollManager />

      <Routes>
        {/* Visitors can browse these pages without an account. */}
        <Route path="/" element={<HomePage />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/destinations" element={<DestinationsPage />} />
        <Route path="/destinations/:slug" element={<DestinationDetailsPage />} />
        <Route path="/culture" element={<CultureEventsPage />} />
        <Route path="/map" element={<CentralMapPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* These personal pages still require a signed-in user. */}
        <Route element={<ProtectedLayout />}>
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/visited" element={<VisitedPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        {/* Admin pages use a separate guard and layout. */}
        <Route element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/destinations" element={<AdminDestinationsPage />} />
          <Route path="/admin/events" element={<AdminEventsPage />} />
          <Route path="/admin/users" element={<AdminUsersPage />} />
          <Route path="/admin/reviews" element={<AdminReviewsPage />} />
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
          <Route path="/admin/profile" element={<AdminProfilePage />} />
        </Route>
      </Routes>

      <AuthOnlyAssistant />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
