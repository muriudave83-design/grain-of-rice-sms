import React from "react";

export default function Topbar({ title = "Admin Dashboard" }) {
  const userName = localStorage.getItem("name") || "Admin";

  return (
    <header className="flex items-center justify-between px-6 bg-white border-b h-14 shadow-sm">
      {/* LEFT SIDE */}
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 rounded hover:bg-gray-100">☰</button>

        <div>
          <h2 className="text-lg font-semibold text-gray-800">{title}</h2>
          <div className="text-xs text-gray-500">
            Manage school operations
          </div>
        </div>
      </div>

      {/* RIGHT SIDE */}
      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-600 hidden sm:block">
          {userName}
        </div>
      </div>
    </header>
  );
}