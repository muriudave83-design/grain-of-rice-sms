import { useEffect, useState } from "react";
import apiClient from "../../../services/apiClient";

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState([]);
  const [action, setAction] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadLogs() {
      setLoading(true);
      setError(null);

      try {
        const params = {};
        if (action) params.action = action;
        if (role) params.role = role;

        const res = await apiClient.get("/audit-logs", {
          params,
        });

        setLogs(res.data.items || []);
      } catch {
        setError("Failed to load audit logs.");
      } finally {
        setLoading(false);
      }
    }

    loadLogs();
  }, [action, role]);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Audit Logs
      </h1>

      {/* Filters */}
      <div className="flex gap-4 mb-4">
        <select
          value={action}
          onChange={(e) => setAction(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All actions</option>
          <option value="LOGIN">LOGIN</option>
          <option value="REPORT_CARD_PUBLISHED">
            REPORT_CARD_PUBLISHED
          </option>
          <option value="ATTENDANCE_SUBMITTED">
            ATTENDANCE_SUBMITTED
          </option>
        </select>

        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">All roles</option>
          <option value="ADMIN">ADMIN</option>
          <option value="TEACHER">TEACHER</option>
          <option value="PARENT">PARENT</option>
        </select>
      </div>

      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="border rounded">
          <table className="w-full border-collapse">
            <thead className="bg-gray-100">
              <tr>
                <th className="text-left px-4 py-2">Time</th>
                <th className="text-left px-4 py-2">Action</th>
                <th className="text-left px-4 py-2">Actor</th>
                <th className="text-left px-4 py-2">Role</th>
                <th className="text-left px-4 py-2">Entity</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-6 text-gray-600"
                  >
                    No audit logs found.
                  </td>
                </tr>
              )}

              {logs.map((log) => (
                <tr key={log.id} className="border-t">
                  <td className="px-4 py-2 text-sm">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-medium">
                    {log.action}
                  </td>
                  <td className="px-4 py-2">
                    {log.actorUserId}
                  </td>
                  <td className="px-4 py-2">
                    {log.actorRole}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">
                    {log.entityType}
                    {log.entityId ? ` · ${log.entityId}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}