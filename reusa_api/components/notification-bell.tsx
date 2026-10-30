"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Notification } from "@/lib/types";

export function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  async function fetchNotifications() {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch {
      // Ignorar errores transitorios de red
    }
  }

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000); // Polling cada 15s
    return () => clearInterval(interval);
  }, []);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function markAsRead(notification: Notification) {
    if (!notification.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      fetch(`/api/notifications/${notification.id}/read`, { method: "PATCH" }).catch(() => {});
    }
    setOpen(false);
    if (notification.targetPath) {
      router.push(notification.targetPath);
    }
  }

  async function markAllAsRead() {
    setLoading(true);
    try {
      await fetch("/api/notifications", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) fetchNotifications();
        }}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200"
        aria-label="Notificaciones"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.75}
          stroke="currentColor"
          className="h-5 w-5"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0"
          />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-zinc-200 bg-white shadow-xl dark:border-zinc-800 dark:bg-zinc-900 z-50 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-100 p-3.5 dark:border-zinc-800">
            <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span>🔔</span> Notificaciones
              {unreadCount > 0 && (
                <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                  {unreadCount} nuevas
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                disabled={loading}
                className="text-xs font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
              >
                Marcar leídas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-zinc-500">
                <p>No tienes notificaciones por ahora.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => markAsRead(n)}
                  className={`w-full text-left p-3.5 transition flex gap-3 items-start hover:bg-zinc-50 dark:hover:bg-zinc-800/60 ${
                    !n.read ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                  }`}
                >
                  <span className="text-lg">
                    {n.type === "item_submitted"
                      ? "📦"
                      : n.type === "item_reviewed"
                      ? "✅"
                      : n.type === "item_requested"
                      ? "🙋"
                      : "🎉"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={`text-xs font-bold truncate ${!n.read ? "text-emerald-900 dark:text-emerald-300" : "text-zinc-800 dark:text-zinc-200"}`}>
                        {n.title}
                      </p>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      {new Date(n.createdAt).toLocaleDateString("es-CO", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
