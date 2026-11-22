import { ADMIN_API_BASE_URL } from "./admin-api";

// Remove a trailing slash so URLs like "...:8000/api/notifications" are built
// correctly even when the environment variable ends with a slash.
const API_BASE_URL = ADMIN_API_BASE_URL.replace(/\/$/, "");

// This shape matches the notification fields returned by Laravel.
// The frontend keeps the snake_case names so it can use the API response directly.
export interface NotificationItem {
  id: number;
  title: string;
  message: string;
  type: string;
  related_id?: number;
  read_at?: string | null;
  created_at: string;
}

// Shared fetch helper for every notification action.
// It attaches the saved login token so Laravel knows which user owns the action,
// and it throws a readable error when the server rejects the request.
async function notificationRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("asc_token");

  if (!token) {
    throw new Error("Please log in to manage notifications.");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new Error("The notification request could not be completed.");
  }

  return (await response.json()) as T;
}

// Get the newest notifications for the signed-in user.
export async function fetchNotifications(): Promise<NotificationItem[]> {
  const payload = await notificationRequest<NotificationItem[] | { data?: NotificationItem[] }>(
    "/api/notifications"
  );

  return Array.isArray(payload) ? payload : payload.data ?? [];
}

// Mark one notification as read after the user opens it.
export async function markNotificationRead(id: number): Promise<void> {
  await notificationRequest(`/api/notifications/${id}/read`, { method: "PATCH" });
}

// Mark one notification as unread from the three-dot menu.
// This makes the notification appear unread again on the next panel refresh.
export async function markNotificationUnread(id: number): Promise<void> {
  await notificationRequest(`/api/notifications/${id}/unread`, { method: "PATCH" });
}

// Mark all of the signed-in user's unread notifications as read in one request.
export async function markAllNotificationsRead(): Promise<void> {
  await notificationRequest("/api/notifications/read-all", { method: "PATCH" });
}

// Permanently delete one notification after the user confirms the action.
export async function deleteNotification(id: number): Promise<void> {
  await notificationRequest(`/api/notifications/${id}`, { method: "DELETE" });
}
