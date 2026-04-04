import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function NotificationBell() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // ✅ DISABLED (no backend support yet)
  useEffect(() => {
    console.log("🔕 Notifications disabled (not in this backend version)");
    setLoading(false);
  }, []);

  async function fetchNotifications() {
    try {
      const res = await apiClient.get("/notifications");

      if (Array.isArray(res.data)) {
        setItems(res.data);
      } else if (Array.isArray(res.data?.items)) {
        setItems(res.data.items);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn("Notifications not available yet");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await apiClient.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, readAt: new Date().toISOString() }
            : n
        )
      );
    } catch {
      // silent fail
    }
  }

  const unreadCount = items.filter((n) => !n.readAt).length;
  const recent = items.slice(0, 5);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2"
        aria-label="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border rounded shadow-lg z-50">
          <div className="p-3 border-b font-medium text-sm">
            Notifications
          </div>

          {loading ? (
            <div className="p-3 text-sm text-gray-500">
              Loading…
            </div>
          ) : recent.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              No notifications
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              {recent.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 border-b text-sm ${
                    n.readAt ? "bg-white" : "bg-blue-50"
                  }`}
                >
                  <div className="font-medium">
                    {n.title || "Notification"}
                  </div>

                  {n.message && (
                    <div className="text-gray-600">
                      {n.message}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-400">
                      {n.occurredAt
                        ? new Date(n.occurredAt).toLocaleString()
                        : ""}
                    </span>

                    {!n.readAt && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs underline"
                      >
                        Mark read
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="p-2 border-t text-center">
            <Link
              to="/notifications"
              className="text-sm underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}