import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router";

const navLinks = [
  { label: "Home", to: "/home" },
  { label: "Destinations", to: "/destinations" },
  { label: "Culture & Events", to: "/culture" },
  { label: "About", to: "/about" },
];

interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  related_id?: number;
  read_at?: string | null;
  created_at: string;
}

function Navbar() {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const username = localStorage.getItem("asc_user_name") || "Cordova Explorer";
  const userEmail = localStorage.getItem("asc_user_email") || "explorer@asasa-cordova.ph";
  const token = localStorage.getItem("asc_token");

  useEffect(() => {
    function handleScroll() {
      if (window.scrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    }

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

    if (token) {
      fetchNotifications();
    }

    return () => {
      window.removeEventListener("scroll", handleScroll);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [token]);

  async function fetchNotifications() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  }

  async function markAsRead(id: number) {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/notifications/${id}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
        );
      }
    } catch (err) {
      console.error("Failed to mark notification as read", err);
    }
  }

  async function markAllAsRead() {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/notifications/read-all", {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
        );
      }
    } catch (err) {
      console.error("Failed to mark all as read", err);
    }
  }

  function handleNotificationClick(notif: NotificationItem) {
    markAsRead(notif.id);
    setIsNotifOpen(false);
    if (notif.type === "event") {
      navigate("/culture");
    } else if (notif.type === "feedback_reply") {
      navigate("/profile");
    }
  }

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  async function handleLogout() {
    const token = localStorage.getItem("asc_token");
    if (token) {
      try {
        await fetch("http://127.0.0.1:8000/api/auth/logout", {
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
    setIsProfileDropdownOpen(false);
    navigate("/login", { replace: true });
    window.location.href = "/login";
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[1000] px-6 py-4 transition-all duration-300 sm:px-10 ${
        isScrolled
          ? "bg-[#FFFAF8]/95 shadow-md backdrop-blur-md border-b border-[#F1E5DF] py-3.5"
          : "bg-gradient-to-b from-[#292929]/70 via-[#292929]/30 to-transparent"
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between">
        <Link
          to="/home"
          className="font-display text-xl font-bold tracking-wide sm:text-2xl flex items-center gap-2.5"
          aria-label="Asa sa Cordova Home"
        >
          <span className={isScrolled ? "text-[#292929]" : "text-white"}>
            Asa sa <span className={isScrolled ? "text-[#C96B6B]" : "text-[#E8A0A0]"}>Cordova</span>
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
                  ? "text-[#716767] hover:text-[#C96B6B]"
                  : "text-white/90 hover:text-[#E8A0A0]"
              }`}
            >
              {link.label}
            </Link>
          ))}

          {/* Notification Bell */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                if (!isNotifOpen) fetchNotifications();
              }}
              className={`relative flex h-10 w-10 items-center justify-center rounded-full border transition ${
                isScrolled
                  ? "border-[#E8A0A0] bg-[#FFF5F5] text-[#C96B6B] hover:bg-[#FCEBEC]"
                  : "border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              }`}
              aria-label="Notifications"
            >
              <span className="text-base">🔔</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#C96B6B] text-[10px] font-bold text-white shadow-md">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-3xl border border-[#F1E5DF] bg-white p-4 shadow-2xl z-50">
                <div className="flex items-center justify-between pb-3 border-b border-[#F1E5DF]">
                  <div>
                    <h4 className="font-display text-sm font-bold text-[#292929]">Notifications</h4>
                    <p className="text-[11px] text-[#716767]">Stay updated with events and feedback replies</p>
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={markAllAsRead}
                      className="text-xs font-semibold text-[#C96B6B] hover:underline"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto py-2 space-y-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#716767]">
                      No notifications yet.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`cursor-pointer rounded-2xl p-3 transition border ${
                          notif.read_at
                            ? "bg-white border-[#F1E5DF] hover:bg-[#FFFAF8]"
                            : "bg-[#FFF5F5] border-[#E8A0A0]/60 hover:bg-[#FCEBEC]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-xs font-bold text-[#292929]">{notif.title}</p>
                          {!notif.read_at && (
                            <span className="h-2 w-2 rounded-full bg-[#C96B6B] shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#716767] leading-relaxed">{notif.message}</p>
                        <p className="mt-2 text-[10px] text-[#716767]/70">
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
                  ? "border-[#E8A0A0] bg-[#FFF5F5] text-[#292929] hover:bg-[#FCEBEC]"
                  : "border-white/40 bg-white/10 text-white backdrop-blur-md hover:bg-white/20"
              }`}
              aria-expanded={isProfileDropdownOpen}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#C96B6B] text-xs text-white font-bold">
                {username.charAt(0)}
              </span>
              <span>{username}</span>
              <span className="text-xs">▼</span>
            </button>

            {isProfileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl border border-[#F1E5DF] bg-white p-3 shadow-2xl z-50">
                <div className="px-3 py-2 border-b border-[#F1E5DF] mb-2">
                  <p className="text-xs font-bold text-[#292929]">{username}</p>
                  <p className="text-[11px] text-[#716767] truncate">{userEmail}</p>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#292929] hover:bg-[#FFF5F5] hover:text-[#C96B6B]"
                >
                  <span>👤</span> My Profile
                </Link>
                <Link
                  to="/favorites"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#292929] hover:bg-[#FFF5F5] hover:text-[#C96B6B]"
                >
                  <span>❤️</span> My Favorites / Saved
                </Link>
                <Link
                  to="/visited"
                  onClick={() => setIsProfileDropdownOpen(false)}
                  className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#292929] hover:bg-[#FFF5F5] hover:text-[#C96B6B]"
                >
                  <span>✓</span> Visited Destinations
                </Link>
                <div className="my-1.5 border-t border-[#F1E5DF]" />
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold text-[#C96B6B] hover:bg-[#FFF5F5]"
                >
                  <span>🚪</span> Log Out
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Menu Button */}
        <div className="flex items-center gap-3 md:hidden">
          {/* Mobile Notification Icon */}
          <button
            type="button"
            onClick={() => {
              setIsNotifOpen((prev) => !prev);
              if (!isNotifOpen) fetchNotifications();
            }}
            className={`relative flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${
              isScrolled
                ? "border-[#F1E5DF] bg-[#FFF5F5] text-[#C96B6B]"
                : "border-white/30 bg-black/20 text-white"
            }`}
            aria-label="Notifications"
          >
            <span>🔔</span>
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C96B6B] text-[9px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setIsMenuOpen((previous) => !previous)}
            className={`flex h-10 w-10 items-center justify-center rounded-xl border text-xl transition ${
              isScrolled
                ? "border-[#F1E5DF] bg-[#FFF5F5] text-[#292929]"
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
            {isMenuOpen ? "✕" : "☰"}
          </button>
        </div>
      </nav>

      {/* Mobile Notification Modal / Dropdown */}
      {isNotifOpen && (
        <div className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#F1E5DF] bg-white p-4 shadow-2xl md:hidden">
          <div className="flex items-center justify-between pb-3 border-b border-[#F1E5DF]">
            <h4 className="font-display text-sm font-bold text-[#292929]">Notifications</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="text-xs font-semibold text-[#C96B6B]"
              >
                Mark all as read
              </button>
            )}
          </div>
          <div className="max-h-60 overflow-y-auto py-2 space-y-2">
            {notifications.length === 0 ? (
              <p className="text-center text-xs text-[#716767] py-4">No notifications yet.</p>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`rounded-xl p-3 border ${notif.read_at ? "bg-white" : "bg-[#FFF5F5]"}`}
                >
                  <p className="text-xs font-bold text-[#292929]">{notif.title}</p>
                  <p className="text-xs text-[#716767] mt-1">{notif.message}</p>
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
          className="mx-auto mt-4 max-w-7xl rounded-2xl border border-[#F1E5DF] bg-white p-6 shadow-2xl md:hidden"
        >
          <div className="flex flex-col gap-4">
            <div className="rounded-xl bg-[#FCEBEC] p-3 mb-2">
              <p className="text-xs font-bold text-[#292929]">{username}</p>
              <p className="text-[11px] text-[#716767]">{userEmail}</p>
            </div>

            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.to}
                onClick={() => setIsMenuOpen(false)}
                className="text-sm font-semibold text-[#292929] transition hover:text-[#C96B6B]"
              >
                {link.label}
              </Link>
            ))}

            <div className="my-2 border-t border-[#F1E5DF]" />

            <Link
              to="/profile"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-semibold text-[#292929]"
            >
              👤 My Profile
            </Link>
            <Link
              to="/favorites"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-semibold text-[#292929]"
            >
              ❤️ My Favorites
            </Link>
            <Link
              to="/visited"
              onClick={() => setIsMenuOpen(false)}
              className="text-sm font-semibold text-[#292929]"
            >
              ✓ Visited Destinations
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="text-left text-sm font-semibold text-[#C96B6B] pt-2"
            >
              🚪 Log Out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default Navbar;
