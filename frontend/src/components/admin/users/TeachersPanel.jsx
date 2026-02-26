import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function TeachersPanel({ teachers = [] }) {
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
            </tr>
          </thead>

          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr>
                <td
                  colSpan="3"
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
                      {teacher.status || "Inactive"}
                    </span>
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