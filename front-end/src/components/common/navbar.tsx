import { useState, useEffect, useRef, useCallback } from "react";
import { Link, useNavigate } from "react-router";
import {
  Bell,
  ChevronDown,
  Heart,
  Info,
  LogOut,
  MapPinned,
  Menu,
  UserRound,
  X,
} from "lucide-react";
import {
  NotificationItemMenu,
  NotificationPanelMenu,
} from "@/components/common/notification-menu";
import {
  deleteNotification as deleteNotificationRequest,
  fetchNotifications as fetchNotificationList,
  markAllNotificationsRead,
  markNotificationRead,
  markNotificationUnread,
  type NotificationItem,
} from "@/lib/notification-api";

import { API_BASE_URL } from "@/lib/api-config";

// This list drives both the desktop links and the mobile menu.
const navLinks = [
  { label: "Home", to: "/home" },
  { label: "Destinations", to: "/destinations" },
  { label: "Culture & Events", to: "/culture" },
];

// Top navigation for signed-in visitors, with extra admin-only controls.
function Navbar() {
  const navigate = useNavigate();
  // Each state value controls one visible part of the navbar.
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // The admin link depends on the role confirmed by the server.
  const [isAdmin, setIsAdmin] = useState(false);
  // Keeping notifications in state lets read/unread changes appear instantly.
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Refs let outside-click checks see whether a menu was clicked.
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Cached profile details make the navbar quick; the role is checked again below.
  const username = localStorage.getItem("asc_user_name") || "Cordova Explorer";
  const userEmail = localStorage.getItem("asc_user_email") || "explorer@asasa-cordova.ph";
  const token = localStorage.getItem("asc_token");

  // Ask the API for the real role, so only admins see the dashboard link.
  const fetchUserRole = useCallback(async () => {
    try {
      const currentToken = localStorage.getItem("asc_token");
      // Bearer token tells Laravel which user's role to return.
      const res = await fetch(`${API_BASE_URL}/api/auth/user`, {
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Accept: "application/json",
        },
      });

      if (res.ok) {
        const payload = await res.json();
        // Some responses wrap the user in a "user" key.
        const user = payload?.user ?? payload;
        const role = user?.role === "admin" ? "admin" : "user";
        // Save and apply the result so the link appears without a refresh.
        localStorage.setItem("asc_user_role", role);
        setIsAdmin(role === "admin");
      } else {
        // A failed check hides admin-only controls for safety.
        localStorage.removeItem("asc_user_role");
        setIsAdmin(false);
      }
    } catch {
      setIsAdmin(false);
    }
  }, []);

  // useCallback keeps this function stable so the effect below does not rerun often.
  // Load notifications through the shared API helper. The helper adds the
  // login token, so the backend returns only this user's notifications.
  const fetchNotifications = useCallback(async () => {
    try {
      setNotifications(await fetchNotificationList());
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }, []);

  // Scroll changes the header style, outside clicks close menus, and login data loads once.
  useEffect(() => {
    // A scrolled page gets a solid background so links stay readable.
    function handleScroll() {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }

    // Close a popover when the user clicks somewhere else on the page.
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsProfileDropdownOpen(false);
      }
      if (
        notifRef.current &&
        !notifRef.current.contains(event.target as Node)
      ) {
        setIsNotifOpen(false);
      }
    }

    window.addEventListener("scroll", handleScroll);
    document.addEventListener("mousedown", handleClickOutside);
    handleScroll();

    // Defer API calls until after the first paint; guests have no token to send.
    let fetchTimer: number | undefined;
    if (token) {
      fetchTimer = window.setTimeout(() => {
        void fetchNotifications();
        void fetchUserRole();
      }, 0);
    }

    // Remove listeners and the timer when the navbar unmounts.
    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
      if (fetchTimer !== undefined) window.clearTimeout(fetchTimer);
    };
  }, [token, fetchNotifications, fetchUserRole]);

  // Mark one notification as read in the database, then update local state so
  // the unread dot and badge disappear without waiting for a page refresh.
  async function markAsRead(id: number) {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }

  // The three-dot header menu calls this to mark every unread item as read.
  // Existing read_at values are kept so already-read items are not rewritten.
  async function markAllAsRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
      );
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }

  // The per-notification menu calls this to make one notification unread again.
  // Clearing read_at immediately increases the badge count in the UI.
  async function markAsUnread(id: number) {
    try {
      await markNotificationUnread(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: null } : n))
      );
    } catch (err) {
      console.error("Failed to mark notification as unread", err);
    }
  }

  // Delete removes the notification from the database, then filters it out of
  // local state so the list and unread count update immediately.
  async function handleDeleteNotification(id: number) {
    if (!window.confirm("Delete this notification?")) return;

    try {
      await deleteNotificationRequest(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error("Failed to delete notification", err);
    }
  }

  // Clicking the notification body marks it read and opens the related page.
  // The three-dot menu stops its own clicks so they do not run this navigation.
  function handleNotificationClick(notif: NotificationItem) {
    void markAsRead(notif.id);
    setIsNotifOpen(false);
    if (notif.type === "event") {
      navigate("/culture");
    } else if (notif.type === "feedback_reply") {
      navigate("/profile");
    }
  }

  // The badge count is calculated from current state, so it changes as soon as
  // an item is marked read, marked unread, or deleted.
  const unreadCount = notifications.filter((n) => !n.read_at).length;

  // Tell Laravel the session is ending, then clear local data even if the request fails.
  async function handleLogout() {
    const token = localStorage.getItem("asc_token");
    if (token) {
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
        console.error("Logout API error", err);
      }
    }
    localStorage.removeItem("asc_token");
    localStorage.removeItem("asc_user_email");
    localStorage.removeItem("asc_user_name");
    // Clearing the role prevents admin links from appearing after logout.
    localStorage.removeItem("asc_user_role");
    setIsAdmin(false);
    setIsProfileDropdownOpen(false);
    navigate("/login", { replace: true });
    window.location.href = "/login";
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1000] px-6 py-4 transition-all duration-300 sm:px-10 ${
        isScrolled
          ? "bg-[#FAF6F5]/95 shadow-md backdrop-blur-md border-b border-[#EBD5D3] py-3.5"
          : "bg-gradient-to-b from-[#58111A]/70 via-[#58111A]/30 to-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          to="/home"
          className="font-display text-xl font-bold tracking-wide sm:text-2xl flex items-center gap-2.5"
          aria-label="Asa sa Cordova Home"
        >
          <span className={isScrolled ? "text-[#58111A]" : "text-white"}>
            Asa sa <span className={isScrolled ? "text-[#800020]" : "text-[#F2DCDA]"}>Cordova</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-7 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              to={link.to}
              className={`text-sm font-medium transition-colors duration-300 ${
                isScrolled
                  ? "text-[#7A585B] hover:text-[#800020]"
                  : "text-white/90 hover:text-[#F2DCDA]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Only users confirmed as admins get the desktop dashboard link. */}
          {isAdmin && (
            <Link
              to="/admin/dashboard"
              className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                isScrolled
                  ? "bg-[#800020] text-white hover:bg-[#58111A]"
                  : "border border-white/50 bg-white/15 text-white hover:bg-white/25"
              }`}
            >
              Admin Dashboard
            </Link>
          )}

          {token ? (
            <>
              {/* Notification Bell */}
              <div className="relative" ref={notifRef}>
            {/* Toggling the bell open also refreshes the list from the server. */}
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                if (!isNotifOpen) fetchNotifications();
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#800020] bg-[#800020] text-white transition hover:border-[#58111A] hover:bg-[#58111A]"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={2} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#800020] shadow-md">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl border border-[#EBD5D3] bg-white p-4 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-3 border-b border-[#EBD5D3]">
                    <div>
                      <h4 className="font-display text-sm font-bold text-[#58111A]">Notifications</h4>
                      <p className="text-[11px] text-[#7A585B]">Stay updated with events and Philippine holidays</p>
                    </div>
                    {/* Mark All as Read now lives inside this three-dot menu. */}
                    <NotificationPanelMenu onMarkAllRead={() => void markAllAsRead()} />
                </div>

                <div className="max-h-80 overflow-y-auto py-2 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#7A585B]">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`cursor-pointer rounded-2xl border p-3 transition ${
                          notif.read_at
                            ? "border-[#EBD5D3] bg-white hover:border-[#800020]/30 hover:bg-[#FAF6F5] active:bg-[#F2DCDA]"
                            : "border-[#800020]/30 bg-[#FFF0F2] hover:bg-[#F2DCDA] active:bg-[#F2DCDA]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-[#58111A]">{notif.title}</p>
                          <div className="flex shrink-0 items-center gap-1">
                            {!notif.read_at && (
                              <span className="h-2 w-2 rounded-full bg-[#800020]" />
                            )}
                            <NotificationItemMenu
                              onMarkUnread={() => void markAsUnread(notif.id)}
                              onDelete={() => void handleDeleteNotification(notif.id)}
                            />
                          </div>
                        </div>
                        <p className="mt-1 text-xs text-[#7A585B] leading-relaxed">{notif.message}</p>
                        <p className="mt-2 text-[10px] text-[#7A585B]/70">
                          {new Date(notif.created_at).toLocaleDateString()} at{" "}
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Profile Dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsProfileDropdownOpen((prev) => !prev)}
              className={`flex items-center gap-2.5 rounded-full border px-5 py-2 text-sm font-semibold transition ${
                isScrolled
                  ? "border-[#EBD5D3] bg-[#FFF0F2] text-[#58111A] hover:bg-[#F2DCDA]"
                  : "border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              }`}
              aria-expanded={isProfileDropdownOpen}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#800020] text-xs text-white font-bold">
                {username.charAt(0)}
              </span>
              <span>{username}</span>
              <span className="text-xs">
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              </span>
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#EBD5D3] bg-white p-3 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-[#EBD5D3] mb-2">
                  <p className="text-xs font-bold text-[#58111A]">{username}</p>
                  <p className="text-[11px] text-[#7A585B] truncate">{userEmail}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#58111A] hover:bg-[#FFF0F2] hover:text-[#800020]"
                >
                  <UserRound size={16} strokeWidth={2} aria-hidden="true" /> My Profile
                </Link>
                <Link
                  to="/about"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#58111A] hover:bg-[#FFF0F2] hover:text-[#800020]"
                >
                  <Info size={16} strokeWidth={2} aria-hidden="true" /> About
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#58111A] hover:bg-[#FFF0F2] hover:text-[#800020]"
                >
                  <Heart size={16} strokeWidth={2} aria-hidden="true" /> My Favorites / Saved
                </Link>
                <Link
                  to="/visited"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#58111A] hover:bg-[#FFF0F2] hover:text-[#800020]"
                >
                  <MapPinned size={16} strokeWidth={2} aria-hidden="true" /> Visited Destinations
                </Link>
                <div className="my-1.5 border-t border-[#EBD5D3]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#800020] hover:bg-[#FFF0F2]"
                >
                  <LogOut size={16} strokeWidth={2} aria-hidden="true" /> Log Out
                </button>
              </div>
            )}
          </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className={`rounded-full border px-4 py-2 text-xs font-bold transition ${
                  isScrolled
                    ? "border-[#800020] text-[#800020] hover:bg-[#FFF0F2]"
                    : "border-white/50 text-white hover:bg-white/20"
                }`}
              >
                Log In
              </Link>
              <Link
                to="/signup"
                className="rounded-full bg-[#800020] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#58111A]"
              >
                Sign Up
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Signed-in users also get a compact notification button on mobile. */}
          {token && (
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                if (!isNotifOpen) fetchNotifications();
              }}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#800020] bg-[#800020] text-white transition hover:border-[#58111A] hover:bg-[#58111A]"
              aria-label="Notifications"
            >
              <Bell size={20} strokeWidth={2} aria-hidden="true" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white text-[9px] font-bold text-[#800020]">
                  {unreadCount}
                </span>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${
              isScrolled
                ? "border-[#EBD5D3] bg-[#FFF0F2] text-[#58111A]"
                : "border-white/30 bg-black/20 text-white"
            }`}
            aria-label={
              isMenuOpen
                ? "Close navigation menu"
                : "Open navigation menu"
            }
            aria-expanded={isMenuOpen}
            aria-controls="mobile-navigation"
          >
            {isMenuOpen ? (
              <X size={20} strokeWidth={2} aria-hidden="true" />
            ) : (
              <Menu size={20} strokeWidth={2} aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Notification Modal / Dropdown */}
      {isNotifOpen && token && (
        <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#EBD5D3] bg-white p-4 shadow-2xl md:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#EBD5D3]">
            <h4 className="font-display text-sm font-bold text-[#58111A]">Notifications</h4>
            {/* Same three-dot menu on mobile keeps the panel compact. */}
            <NotificationPanelMenu onMarkAllRead={() => void markAllAsRead()} />
          </div>
          <div className="max-h-60 overflow-y-auto py-2 space-y-2">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-[#7A585B] py-4">No notifications yet.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`cursor-pointer rounded-xl border p-3 transition ${
                    notif.read_at
                      ? "border-[#EBD5D3] bg-white hover:border-[#800020]/30 hover:bg-[#FFF0F2]"
                      : "border-[#800020]/30 bg-[#FFF0F2] hover:bg-[#F2DCDA]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs font-bold text-[#58111A]">{notif.title}</p>
                    <div className="flex shrink-0 items-center gap-1">
                      {!notif.read_at && (
                        <span className="h-2 w-2 rounded-full bg-[#800020]" />
                      )}
                      <NotificationItemMenu
                        onMarkUnread={() => void markAsUnread(notif.id)}
                        onDelete={() => void handleDeleteNotification(notif.id)}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-[#7A585B] mt-1">{notif.message}</p>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div
          id="mobile-navigation"
          className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#EBD5D3] bg-white p-6 shadow-2xl md:hidden"
        >
          <div className="flex flex-col gap-4">
            {token ? (
              <>
                <div className="rounded-xl bg-[#FFF0F2] p-3 mb-2">
                  <p className="text-xs font-bold text-[#58111A]">{username}</p>
                  <p className="text-[11px] text-[#7A585B]">{userEmail}</p>
                </div>

                {/* The mobile menu repeats the same admin-only link. */}
                {isAdmin && (
                  <Link
                    to="/admin/dashboard"
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-full bg-[#800020] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#58111A]"
                  >
                    Admin Dashboard
                  </Link>
                )}

                <div className="my-2 border-t border-[#EBD5D3]" />

                <Link
                  to="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-semibold text-[#58111A]"
                >
                  <span className="inline-flex items-center gap-2">
                    <UserRound size={16} strokeWidth={2} aria-hidden="true" /> My Profile
                  </span>
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-semibold text-[#58111A]"
                >
                  <span className="inline-flex items-center gap-2">
                    <Heart size={16} strokeWidth={2} aria-hidden="true" /> My Favorites
                  </span>
                </Link>
                <Link
                  to="/visited"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-sm font-semibold text-[#58111A]"
                >
                  <span className="inline-flex items-center gap-2">
                    <MapPinned size={16} strokeWidth={2} aria-hidden="true" /> Visited Destinations
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="text-left text-sm font-semibold text-[#800020] pt-2"
                >
                  <span className="inline-flex items-center gap-2">
                    <LogOut size={16} strokeWidth={2} aria-hidden="true" /> Log Out
                  </span>
                </button>
              </>
            ) : (
              <>
                <div className="rounded-xl bg-[#FFF0F2] p-3 mb-2">
                  <p className="text-xs font-bold text-[#58111A]">Browsing as a guest</p>
                  <p className="text-[11px] text-[#7A585B]">
                    Sign in to save favorites and track visited places.
                  </p>
                </div>
                <Link
                  to="/login"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full bg-[#800020] px-4 py-2.5 text-center text-sm font-bold text-white transition hover:bg-[#58111A]"
                >
                  Log In
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMenuOpen(false)}
                  className="rounded-full border border-[#800020] px-4 py-2.5 text-center text-sm font-bold text-[#800020] transition hover:bg-[#FFF0F2]"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
