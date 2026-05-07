import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function StudentsPanel({
  students = [],
  onEdit = () => {},
  onArchive = () => {}, // toggle archive/restore
  onReset = () => {},
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const searchLower = search.toLowerCase();

    return students.filter((user) => {
      const name = user?.name || "";
      const email = user?.email || "";

      return (
        name.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower)
      );
    });
  }, [students, search]);

  return (
    <div>
      <UserSearch
        value={search}
        onChange={setSearch}
        placeholder="Search students by name or email..."
      />

      {filtered.length === 0 ? (
        <div className="text-center text-gray-500 py-6">
          No students found
        </div>
      ) : (
        <div className="bg-white border rounded overflow-x-auto mt-4">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Status</th>
                <th className="p-3 w-56">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((user) => {
                const name = user?.name || "—";
                const email = user?.email || "—";

                // 🔥 SINGLE SOURCE OF TRUTH (DERIVED STATUS)
                const status = user?.isArchived
                  ? "archived"
                  : user?.isActive
                  ? "active"
                  : "inactive";

                return (
                  <tr
                    key={user.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="p-3">{name}</td>
                    <td className="p-3">{email}</td>

                    {/* ✅ BULLETPROOF STATUS */}
                    <td className="p-3">
                      {status === "archived" && (
                        <span className="text-red-600 text-xs">
                          Archived
                        </span>
                      )}
                      {status === "active" && (
                        <span className="text-green-600 text-xs">
                          Active
                        </span>
                      )}
                      {status === "inactive" && (
                        <span className="text-gray-500 text-xs">
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* ✅ BULLETPROOF ACTIONS */}
                    <td className="p-3 space-x-3">
                      <button
                        onClick={() => onEdit(user)}
                        className="text-blue-600 text-xs hover:underline"
                      >
                        Edit
                      </button>

                      {status === "archived" ? (
                        <button
                          onClick={() => onArchive(user.id)}
                          className="text-green-600 text-xs hover:underline"
                        >
                          Restore
                        </button>
                      ) : (
                        <button
                          onClick={() => onArchive(user.id)}
                          className="text-red-600 text-xs hover:underline"
                        >
                          Archive
                        </button>
                      )}

                      <button
                        onClick={() => onReset(user)}
                        className="text-orange-600 text-xs hover:underline"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}