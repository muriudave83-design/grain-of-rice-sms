import { Outlet, useNavigate } from "react-router-dom";
import SidebarNav from "../pages/admin/components/SidebarNav";
import Topbar from "../pages/admin/components/Topbar";
import NotificationBell from "../pages/notifications/NotificationBell";

export default function AdminLayout() {
  const navigate = useNavigate();

  // ✅ Logout logic (moved here from Topbar)
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* SIDEBAR */}
      <aside className="w-64 hidden md:flex flex-col bg-white border-r shadow-sm">
        <div className="p-6 border-b">
          <div className="text-xl font-bold text-gray-800">
            Grain of Rice Academy
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Administrator Panel
          </div>
        </div>

        <div className="flex-1 p-2">
          <SidebarNav />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">
        {/* 🔥 TOP BLUE BAR */}
        <div className="h-14 bg-blue-600 text-white flex items-center justify-between px-6 shadow">
          <div className="font-semibold text-sm tracking-wide">
            Grain of Rice Academy
          </div>

          {/* ✅ NAVIGATION LINKS */}
          <div className="hidden md:flex items-center gap-6 text-sm">
            <span
              onClick={() => navigate("/dashboard/admin")}
              className="hover:underline cursor-pointer"
            >
              Dashboard
            </span>

            <span
              onClick={() => navigate("/dashboard/admin/students")}
              className="hover:underline cursor-pointer"
            >
              Students
            </span>

            <span
              onClick={() => navigate("/dashboard/admin/classes")}
              className="hover:underline cursor-pointer"
            >
              Classes
            </span>

            <span
              onClick={() => navigate("/dashboard/admin/attendance")}
              className="hover:underline cursor-pointer"
            >
              Attendance
            </span>
          </div>

          {/* ✅ LOGOUT BUTTON */}
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
          >
            Sign out
          </button>
        </div>

        {/* EXISTING TOPBAR */}
        <div className="flex items-center justify-between px-6 bg-white border-b h-14 shadow-sm">
          <Topbar title="Admin Dashboard" />
          <NotificationBell />
        </div>

        {/* PAGE CONTENT */}
        <main className="p-6">
          <div className="max-w-full mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}