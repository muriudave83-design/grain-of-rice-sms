import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function TeachersPanel({
  teachers = [],
  onEdit,
  onArchive,
  onReset,
}) {
  const [search, setSearch] = useState("");

  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      const nameMatch = teacher.name
        ?.toLowerCase()
        .includes(search.toLowerCase());

      const emailMatch = teacher.email
        ?.toLowerCase()
        .includes(search.toLowerCase());

      return nameMatch || emailMatch;
    });
  }, [teachers, search]);

  return (
    <div>
      <UserSearch
        value={search}
        onChange={setSearch}
        placeholder="Search by name or email..."
      />

      <div className="overflow-x-auto bg-white rounded border border-gray-200">
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
            {filteredTeachers.length === 0 ? (
              <tr>
                <td
                  colSpan="4"
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No users found
                </td>
              </tr>
            ) : (
              filteredTeachers.map((teacher) => (
                <tr
                  key={teacher.id}
                  className="border-t border-gray-200 hover:bg-gray-50 transition"
                >
                  <td className="px-4 py-3 text-gray-800">
                    {teacher.name}
                  </td>

                  <td className="px-4 py-3 text-gray-800">
                    {teacher.email}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`text-sm ${
                        teacher.isActive
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {teacher.isActive ? "Active" : "Archived"}
                    </span>
                  </td>

                  <td className="px-4 py-3 flex gap-2">
                    {/* Edit */}
                    <button
                      onClick={() => onEdit?.(teacher)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>

                    {/* Archive (only if active) */}
                    {teacher.isActive && (
                      <button
                        onClick={() => onArchive?.(teacher.id)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Archive
                      </button>
                    )}

                    {/* Reset Password */}
                    <button
                      onClick={() => onReset?.(teacher)}
                      className="px-3 py-1 text-xs bg-orange-500 text-white rounded hover:bg-orange-600"
                    >
                      Reset
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}