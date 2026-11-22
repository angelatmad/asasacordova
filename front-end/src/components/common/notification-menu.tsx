import { useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import { CheckCheck, MailOpen, MoreVertical, Trash2 } from "lucide-react";

// Small shared button that opens a compact three-dot menu.
// Both notification panels use this so desktop and admin screens look the same.
function MenuTrigger({
  label,
  isOpen,
  onToggle,
}: {
  label: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-expanded={isOpen}
      // Stop the click from reaching the notification row behind the menu.
      // Otherwise clicking the menu would also open the notification.
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      className="flex h-8 w-8 items-center justify-center rounded-full text-[#800020] transition hover:bg-[#FFF0F2] hover:text-[#58111A]"
    >
      <MoreVertical size={17} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}

// Shared wrapper for the menu popup. It closes when the user clicks elsewhere
// and stops menu clicks from bubbling out to the notification row.
function MenuPopup({
  children,
  containerRef,
  isOpen,
  onClose,
}: {
  children: ReactNode;
  containerRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  onClose: () => void;
}) {
  // This effect listens for clicks outside the menu while it is open.
  // Closing on outside click keeps the panel tidy without a page refresh.
  useEffect(() => {
    if (!isOpen) return;

    function handleOutsideClick(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [containerRef, isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      // The notification itself has an onClick handler, so stop menu clicks here.
      onClick={(event) => event.stopPropagation()}
      className="absolute right-0 top-9 z-50 w-48 rounded-xl border border-[#EBD5D3] bg-white p-1.5 shadow-2xl"
    >
      {children}
    </div>
  );
}

// Shared style for each menu option.
// The maroon text and hover background match the rest of the ASC theme.
const menuItemClass =
  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-xs font-semibold text-[#58111A] transition hover:bg-[#FFF0F2] hover:text-[#800020]";

// Three-dot menu in the notification panel header.
// It replaces the old separate "Mark all as read" button.
export function NotificationPanelMenu({
  onMarkAllRead,
}: {
  onMarkAllRead: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleMarkAllRead() {
    onMarkAllRead();
    setIsOpen(false);
  }

  return (
    <div className="relative" ref={containerRef}>
      <MenuTrigger
        label="Notification options"
        isOpen={isOpen}
        onToggle={() => setIsOpen((open) => !open)}
      />
      <MenuPopup
        containerRef={containerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <button type="button" onClick={handleMarkAllRead} className={menuItemClass}>
          <CheckCheck size={15} strokeWidth={2} aria-hidden="true" />
          Mark All as Read
        </button>
      </MenuPopup>
    </div>
  );
}

// Three-dot menu attached to one notification row.
// The parent decides what happens when a user chooses an action; this component
// only opens, closes, and prevents the row click from firing.
export function NotificationItemMenu({
  onMarkUnread,
  onDelete,
}: {
  onMarkUnread: () => void;
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  function handleMarkUnread() {
    onMarkUnread();
    setIsOpen(false);
  }

  function handleDelete() {
    onDelete();
    setIsOpen(false);
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      <MenuTrigger
        label="Notification actions"
        isOpen={isOpen}
        onToggle={() => setIsOpen((open) => !open)}
      />
      <MenuPopup
        containerRef={containerRef}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      >
        <button type="button" onClick={handleMarkUnread} className={menuItemClass}>
          <MailOpen size={15} strokeWidth={2} aria-hidden="true" />
          Mark as Unread
        </button>
        <button
          type="button"
          onClick={handleDelete}
          className={`${menuItemClass} text-[#9B1C1C] hover:bg-[#FFF0F2] hover:text-[#800020]`}
        >
          <Trash2 size={15} strokeWidth={2} aria-hidden="true" />
          Delete
        </button>
      </MenuPopup>
    </div>
  );
}
