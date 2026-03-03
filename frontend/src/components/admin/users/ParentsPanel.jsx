import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function ParentsPanel({
  parents = [],
  onEdit = () => {},
  onArchive = () => {},   // ✅ replaced onToggle
  onReset = () => {},
}) {
  const [search, setSearch] = useState("");

  const filteredParents = useMemo(() => {
    const searchLower = search.toLowerCase();

    return parents.filter((parent) => {
      const name = parent?.name || "";
      const email = parent?.email || "";

      return (
        name.toLowerCase().includes(searchLower) ||
        email.toLowerCase().includes(searchLower)
      );
    });
  }, [parents, search]);

  return (
    <div>
      <UserSearch
        value={search}
        onChange={setSearch}
        placeholder="Search parents by name or email..."
      />

      <div className="overflow-x-auto bg-white rounded border border-gray-200 mt-4">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-gray-600 text-xs uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredParents.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No parents found
                </td>
              </tr>
            ) : (
              filteredParents.map((parent) => {
                const isActive = !!parent?.isActive;

                return (
                  <tr
                    key={parent.id}
                    className="border-t border-gray-200 hover:bg-gray-50 transition"
                  >
                    <td className="px-4 py-3 text-gray-800">
                      {parent.name || "—"}
                    </td>

                    <td className="px-4 py-3 text-gray-800">
                      {parent.email || "—"}
                    </td>

                    <td className="px-4 py-3">
                      {isActive ? (
                        <span className="text-sm text-green-600">
                          Active
                        </span>
                      ) : (
                        <span className="text-sm text-red-600">
                          Archived
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 flex gap-2">
                      {/* Edit */}
                      <button
                        onClick={() => onEdit(parent)}
                        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Edit
                      </button>

                      {/* Archive (only if active) */}
                      {isActive && (
                        <button
                          onClick={() => onArchive(parent.id)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Archive
                        </button>
                      )}

                      {/* Reset Password */}
                      <button
                        onClick={() => onReset(parent)}
                        className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                      >
                        Reset
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}