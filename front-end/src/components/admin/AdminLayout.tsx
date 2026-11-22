import { useCallback, useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  ArrowUpRight,
  BarChart3,
  Bell,
  CalendarDays,
  ChevronDown,
  LayoutDashboard,
  MapPinned,
  Menu,
  MessageSquareText,
  PanelLeftClose,
  PanelRightClose,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { ADMIN_API_BASE_URL } from "@/lib/admin-api";
import {
  NotificationItemMenu,
  NotificationPanelMenu,
} from "@/components/common/notification-menu";
import {
  deleteNotification as deleteNotificationRequest,
  fetchNotifications as fetchNotificationList,
  markAllNotificationsRead,
  markNotificationRead as markNotificationReadRequest,
  markNotificationUnread,
  type NotificationItem,
} from "@/lib/notification-api";

// One list drives the sidebar links; icons come from lucide-react.
const adminNavItems = [
  { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/admin/destinations", label: "Destinations", icon: MapPinned },
  { to: "/admin/events", label: "Events", icon: CalendarDays },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/reviews", label: "Reviews & Feedback", icon: MessageSquareText },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/profile", label: "Profile", icon: UserRound },
];

// Map URL paths to friendly titles shown in the header.
const pageTitles: Record<string, string> = {
  "/admin/dashboard": "Dashboard",
  "/admin/destinations": "Destinations",
  "/admin/events": "Events",
  "/admin/users": "Users",
  "/admin/reviews": "Reviews & Feedback",
  "/admin/analytics": "Analytics",
  "/admin/profile": "Admin Profile",
};

// Shared shell for all admin pages: sidebar, header, notifications, and child page.
export function AdminLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  // State controls the sidebar, mobile drawer, profile menu, and notification panel.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  // Notifications live in state so read/unread changes update without a reload.
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  // Refs help detect clicks outside the two popovers.
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // The URL selects the title; the badge count comes from current state.
  const pageTitle = pageTitles[pathname] ?? "Admin";
  // Cached profile values fill the header until fresh data is loaded elsewhere.
  const username = localStorage.getItem("asc_user_name") || "Administrator";
  const userEmail = localStorage.getItem("asc_user_email") || "";
  const userRole = localStorage.getItem("asc_user_role") || "admin";
  const unreadCount = notifications.filter((item) => !item.read_at).length;

  // useCallback keeps this function stable so the loading effect runs only once.
  // Load notifications through the shared API helper. It adds the saved token
  // so Laravel returns only the signed-in admin's notifications.
  const fetchNotifications = useCallback(async () => {
    try {
      setNotifications(await fetchNotificationList());
    } catch (error) {
      console.error("Failed to load admin notifications", error);
    }
  }, []);

  // Load notifications after the first render so the layout appears quickly.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchNotifications();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  // Moving to another admin page closes any menus that were left open.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsMobileOpen(false);
      setIsProfileOpen(false);
      setIsNotifOpen(false);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  // Outside clicks close the profile and notification popovers.
  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Save one notification as read, then update local state immediately so the
  // unread badge changes without waiting for another database fetch.
  async function markNotificationRead(id: number) {
    try {
      await markNotificationReadRequest(id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: new Date().toISOString() } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as read", error);
    }
  }

  // The header three-dot menu uses this to mark all unread notifications read.
  async function markAllRead() {
    try {
      await markAllNotificationsRead();
      setNotifications((current) =>
        current.map((item) => ({
          ...item,
          read_at: item.read_at ?? new Date().toISOString(),
        }))
      );
    } catch (error) {
      console.error("Failed to mark all notifications as read", error);
    }
  }

  // The row three-dot menu uses this to make one notification unread again.
  async function markNotificationUnreadAction(id: number) {
    try {
      await markNotificationUnread(id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === id ? { ...item, read_at: null } : item
        )
      );
    } catch (error) {
      console.error("Failed to mark notification as unread", error);
    }
  }

  // Delete asks for confirmation, removes the row from the database, then
  // removes it from state so the list and badge update right away.
  async function handleDeleteNotification(id: number) {
    if (!window.confirm("Delete this notification?")) return;

    try {
      await deleteNotificationRequest(id);
      setNotifications((current) => current.filter((item) => item.id !== id));
    } catch (error) {
      console.error("Failed to delete notification", error);
    }
  }

  // Clicking the notification body marks it read and opens the related admin page.
  // Menu clicks are stopped in the menu component, so they do not navigate.
  function handleNotificationClick(item: NotificationItem) {
    void markNotificationRead(item.id);
    setIsNotifOpen(false);
    if (item.type === "event") navigate("/admin/events");
    else if (item.type === "feedback_reply") navigate("/admin/reviews");
  }

  // Call Laravel logout first, then clear local data even if the request fails.
  async function handleLogout() {
    const token = localStorage.getItem("asc_token");

    if (token) {
      try {
        await fetch(`${ADMIN_API_BASE_URL}/api/auth/logout`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
      } catch (error) {
        console.error("Admin logout request failed", error);
      }
    }

    localStorage.removeItem("asc_token");
    localStorage.removeItem("asc_user_email");
    localStorage.removeItem("asc_user_name");
    localStorage.removeItem("asc_user_role");
    navigate("/login", { replace: true });
  }

  // This sidebar markup is reused by both the desktop and mobile layouts.
  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center gap-3 border-b border-white/10 px-5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F2DCDA] font-display text-sm font-bold text-[#800020]">
          AC
        </span>
        {!isCollapsed && (
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-bold text-white">
              Asa sa Cordova
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#F2DCDA]/70">
              Admin Portal
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-5">
        {adminNavItems.map((item) => {
          // NavLink highlights the item that matches the current URL.
          const isActive = pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold transition ${
                isActive
                  ? "bg-[#800020] text-white shadow-md"
                  : "text-[#F2DCDA]/80 hover:bg-white/10 hover:text-white"
              } ${isCollapsed ? "justify-center" : ""}`}
            >
              <item.icon size={20} strokeWidth={2} aria-hidden="true" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      <div className="space-y-1 border-t border-white/10 px-3 py-4">
        <Link
          to="/home"
          title={isCollapsed ? "Back to site" : undefined}
          className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-semibold text-[#F2DCDA]/80 transition hover:bg-white/10 hover:text-white ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <ArrowUpRight size={20} strokeWidth={2} aria-hidden="true" />
          {!isCollapsed && <span>Back to site</span>}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#FAF6F5]">
      {/* Tapping the dark overlay closes the mobile sidebar. */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-[#292929]/50 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Desktop sidebar can collapse to icons to give content more room. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 hidden bg-[#58111A] shadow-xl transition-[width] duration-300 lg:flex ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Mobile sidebar slides in from the left when opened. */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 bg-[#58111A] shadow-xl transition-transform duration-300 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full w-full flex-col">
          {sidebarContent}
        </div>
        <button
          type="button"
          onClick={() => setIsMobileOpen(false)}
          aria-label="Close admin navigation"
          className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm text-white"
        >
          <X size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </aside>

      <div
        className={`transition-[padding] duration-300 ${
          isCollapsed ? "lg:pl-20" : "lg:pl-64"
        }`}
      >
        <header className="sticky top-0 z-30 flex h-[72px] items-center justify-between gap-3 border-b border-[#EBD5D3] bg-white/95 px-4 backdrop-blur-md sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              aria-label="Open admin navigation"
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#EBD5D3] bg-white text-[#800020] lg:hidden"
            >
              <Menu size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIsCollapsed((current) => !current)}
              aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden h-9 w-9 items-center justify-center rounded-xl border border-[#EBD5D3] bg-white text-[#800020] transition hover:bg-[#FFF0F2] lg:flex"
            >
              {isCollapsed ? (
                <PanelRightClose size={18} strokeWidth={2} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={18} strokeWidth={2} aria-hidden="true" />
              )}
            </button>
            <div className="min-w-0">
              <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-[#7A585B] sm:block">
                Admin <span className="mx-1">/</span> {pageTitle}
              </p>
              <h1 className="truncate font-display text-lg font-semibold text-[#58111A] sm:text-xl">
                {pageTitle}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => {
                  setIsNotifOpen((current) => !current);
                  if (!isNotifOpen) void fetchNotifications();
                }}
                aria-label="Admin notifications"
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-[#800020] bg-[#800020] text-white transition hover:bg-[#58111A]"
              >
                <Bell size={18} strokeWidth={2} aria-hidden="true" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[9px] font-bold text-[#800020]">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {isNotifOpen && (
                <div className="absolute right-0 mt-3 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border border-[#EBD5D3] bg-white p-4 shadow-2xl">
                  <div className="flex items-center justify-between border-b border-[#EBD5D3] pb-3">
                    <div>
                      <h2 className="font-display text-sm font-bold text-[#58111A]">
                        Notifications
                      </h2>
                      <p className="text-[11px] text-[#7A585B]">{unreadCount} unread</p>
                    </div>
                    {/* Mark All as Read is now inside this three-dot menu. */}
                    <NotificationPanelMenu onMarkAllRead={() => void markAllRead()} />
                  </div>
                  <div className="max-h-72 space-y-2 overflow-y-auto py-3">
                    {notifications.length === 0 ? (
                      <p className="py-6 text-center text-xs text-[#7A585B]">
                        No notifications yet.
                      </p>
                    ) : (
                      notifications.map((item) => (
                        // The row is a div instead of a button because it now contains
                        // smaller menu buttons. role="button" keeps it keyboard-friendly.
                        <div
                          key={item.id}
                          role="button"
                          tabIndex={0}
                          onClick={() => handleNotificationClick(item)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              handleNotificationClick(item);
                            }
                          }}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            item.read_at
                              ? "border-[#EBD5D3] bg-white hover:bg-[#FAF6F5]"
                              : "border-[#800020]/25 bg-[#FFF0F2] hover:bg-[#F2DCDA]"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-xs font-bold text-[#58111A]">{item.title}</p>
                            {!item.read_at && (
                              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#800020]" />
                            )}
                            <NotificationItemMenu
                              onMarkUnread={() => void markNotificationUnreadAction(item.id)}
                              onDelete={() => void handleDeleteNotification(item.id)}
                            />
                          </div>
                          <p className="mt-1 text-xs text-[#7A585B]">{item.message}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button
                type="button"
                onClick={() => setIsProfileOpen((current) => !current)}
                aria-expanded={isProfileOpen}
                className="flex items-center gap-2 rounded-full border border-[#EBD5D3] bg-[#FAF6F5] py-1.5 pr-3 pl-1.5 text-sm font-semibold text-[#58111A] transition hover:border-[#800020] hover:bg-[#FFF0F2]"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#800020] text-xs font-bold text-white">
                  {username.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate sm:block">{username}</span>
                <ChevronDown size={16} strokeWidth={2} aria-hidden="true" />
              </button>

              {isProfileOpen && (
                <div className="absolute right-0 mt-3 w-60 rounded-2xl border border-[#EBD5D3] bg-white p-3 shadow-2xl">
                  <div className="border-b border-[#EBD5D3] px-2 pb-3">
                    <p className="truncate text-xs font-bold text-[#58111A]">{username}</p>
                    <p className="truncate text-[11px] text-[#7A585B]">{userEmail}</p>
                    <span className="mt-2 inline-block rounded-full bg-[#FFF0F2] px-2.5 py-1 text-[10px] font-bold uppercase text-[#800020]">
                      {userRole}
                    </span>
                  </div>
                  <Link
                    to="/admin/profile"
                    className="mt-2 block rounded-xl px-3 py-2.5 text-xs font-semibold text-[#58111A] hover:bg-[#FFF0F2]"
                  >
                    My admin profile
                  </Link>
                  <Link
                    to="/home"
                    className="block rounded-xl px-3 py-2.5 text-xs font-semibold text-[#58111A] hover:bg-[#FFF0F2]"
                  >
                    Visitor site
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleLogout()}
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold text-[#800020] hover:bg-[#FFF0F2]"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {/* Outlet renders whichever admin page the router matched. */}
          <Outlet />
        </main>
      </div>
    </div>
  );
}
