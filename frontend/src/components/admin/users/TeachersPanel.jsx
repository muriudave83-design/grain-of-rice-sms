import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function TeachersPanel({
  teachers = [],
  onEdit,
  onToggle,
  onReset, // ✅ added
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
        placeholder="Search teachers by name or email..."
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
                  No teachers found
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
                    <span className="text-sm text-gray-600">
                      {teacher.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>

                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => onEdit?.(teacher)}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => onToggle?.(teacher)}
                      className="px-3 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
                    >
                      Toggle
                    </button>

                    {/* ✅ NEW RESET BUTTON */}
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