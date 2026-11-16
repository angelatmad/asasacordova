import "@/styles/global.css";

import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  Routes,
  Route,
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
        window.scrollTo({
          top: 0,
          behavior: "auto",
        });
      }

      return;
    }

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, [pathname, hash]);

  return null;
}

export function App() {
  return (
    <BrowserRouter>
      <ScrollManager />

      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/home" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />

        <Route
          path="/destinations"
          element={<ProtectedRoute><DestinationsPage /></ProtectedRoute>}
        />

        <Route
          path="/destinations/:slug"
          element={<ProtectedRoute><DestinationDetailsPage /></ProtectedRoute>}
        />

        <Route
          path="/culture"
          element={<ProtectedRoute><CultureEventsPage /></ProtectedRoute>}
        />

        <Route
          path="/map"
          element={<ProtectedRoute><CentralMapPage /></ProtectedRoute>}
        />

        <Route
          path="/favorites"
          element={<ProtectedRoute><FavoritesPage /></ProtectedRoute>}
        />

        <Route
          path="/visited"
          element={<ProtectedRoute><VisitedPage /></ProtectedRoute>}
        />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        <Route path="/about" element={<ProtectedRoute><AboutPage /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      </Routes>

      <AscAiAssistant />
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
