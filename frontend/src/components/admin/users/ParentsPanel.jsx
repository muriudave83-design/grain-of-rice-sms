import React, { useState, useMemo } from "react";
import UserSearch from "./UserSearch";

export default function ParentsPanel({ parents = [] }) {
  const [search, setSearch] = useState("");

  const filteredParents = useMemo(() => {
    return parents.filter((parent) => {
      const nameMatch = parent.name
        ?.toLowerCase()
        .includes(search.toLowerCase());

      const emailMatch = parent.email
        ?.toLowerCase()
        .includes(search.toLowerCase());

      return nameMatch || emailMatch;
    });
  }, [parents, search]);

  return (
    <div>
      <UserSearch
        value={search}
        onChange={setSearch}
        placeholder="Search parents by name or email..."
      />

      <div className="overflow-x-auto bg-gray-900 rounded-lg border border-gray-800">
        <table className="w-full text-left">
          <thead className="bg-gray-800 text-gray-300 text-sm uppercase">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>

          <tbody>
            {filteredParents.length === 0 ? (
              <tr>
                <td
                  colSpan="3"
                  className="px-4 py-6 text-center text-gray-500"
                >
                  No parents found
                </td>
              </tr>
            ) : (
              filteredParents.map((parent) => (
                <tr
                  key={parent.id}
                  className="border-t border-gray-800 hover:bg-gray-800 transition"
                >
                  <td className="px-4 py-3">{parent.name}</td>
                  <td className="px-4 py-3">{parent.email}</td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-yellow-400">
                      {parent.status || "Inactive"}
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