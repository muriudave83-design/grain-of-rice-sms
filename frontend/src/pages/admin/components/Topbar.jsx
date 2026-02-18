import React from "react";

export default function Topbar({ title = "Admin Dashboard" }) {
  const userName = localStorage.getItem("name") || "Admin";

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    window.location.href = "/login";
  };

  return (
    <header className="flex items-center justify-between px-6 py-3 border-b bg-white">
      <div className="flex items-center gap-4">
        <button className="md:hidden p-2 rounded hover:bg-gray-100">☰</button>
        <div>
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-xs text-gray-500">Manage school operations</div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-gray-700 hidden sm:block">{userName}</div>
        <button
          onClick={handleLogout}
          className="px-3 py-1 rounded bg-red-50 text-red-700 text-sm border border-red-100"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
