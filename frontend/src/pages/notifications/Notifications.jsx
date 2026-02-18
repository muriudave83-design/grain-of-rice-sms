import { useEffect, useState } from "react";
import api from "@/services/apiClient";
import { Link } from "react-router-dom";

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get("/notifications");
      setItems(res.data.items || []);
    } catch {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setItems((prev) =>
        prev.map((n) =>
          n.id === id ? { ...n, readAt: new Date().toISOString() } : n
        )
      );
    } catch {
      // silent fail
    }
  }

  async function markAllAsRead() {
    try {
      await api.post("/notifications/read-all");
      setItems((prev) =>
        prev.map((n) => ({
          ...n,
          readAt: n.readAt || new Date().toISOString(),
        }))
      );
    } catch {
      // silent fail
    }
  }

  function resolveLink(n) {
    if (!n.entity) return null;

    switch (n.entity.type) {
      case "reportCard":
        return `/report-cards/${n.entity.id}`;
      case "attendance":
        return `/attendance`;
      default:
        return null;
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        {items.some((n) => !n.readAt) && (
          <button
            onClick={markAllAsRead}
            className="text-sm border px-3 py-1 rounded"
          >
            Mark all as read
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="text-gray-600">No notifications yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map((n) => {
            const link = resolveLink(n);

            return (
              <div
                key={n.id}
                className={`border rounded p-4 flex justify-between ${
                  n.readAt ? "bg-white" : "bg-blue-50"
                }`}
              >
                <div>
                  <p className="font-medium">
                    {n.title || "Notification"}
                  </p>
                  {n.message && (
                    <p className="text-sm text-gray-600">
                      {n.message}
                    </p>
                  )}
                </div>

                <div className="text-right text-sm text-gray-500 space-y-1">
                  <div>
                    {new Date(n.occurredAt).toLocaleString()}
                  </div>

                  <div className="flex gap-2 justify-end">
                    {!n.readAt && (
                      <button
                        onClick={() => markAsRead(n.id)}
                        className="text-xs underline"
                      >
                        Mark read
                      </button>
                    )}

                    {link && (
                      <Link
                        to={link}
                        className="text-xs underline"
                      >
                        View
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
