import { Outlet, useNavigate, useLocation } from "react-router-dom";
import SidebarNav from "../pages/admin/components/SidebarNav";
import Topbar from "../pages/admin/components/Topbar";
import NotificationBell from "../pages/notifications/NotificationBell";

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Logout logic
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("name");
    localStorage.removeItem("user");

    navigate("/login");
  };

  // ✅ Dynamic page title
  const getTitle = () => {
    // ✅ MUST COME FIRST
    if (location.pathname.includes("/attendance-reports")) {
      return "Attendance Reports";
    }

    // ✅ TERMS
    if (location.pathname.includes("/terms")) {
      return "Terms";
    }

    if (location.pathname.includes("/reports")) {
      return "Reports";
    }

    if (location.pathname.includes("/students")) {
      return "Students";
    }

    if (location.pathname.includes("/classes")) {
      return "Classes";
    }

    if (location.pathname.includes("/attendance")) {
      return "Attendance";
    }

    if (location.pathname.includes("/fees")) {
      return "Fees";
    }

    if (location.pathname.includes("/sponsorship")) {
      return "Sponsorship";
    }

    if (location.pathname.includes("/discipline")) {
      return "Discipline";
    }

    return "Admin Dashboard";
  };

  // ✅ Active link helper
  const isActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">

      {/* SIDEBAR */}
      <aside className="w-64 flex flex-col bg-white border-r shadow-sm min-h-screen">
        <div className="p-6 border-b">

          <div className="text-xl font-bold text-gray-800">
            Grain of Rice Academy
          </div>

          <div className="text-xs text-gray-500 mt-1">
            Administrator Panel
          </div>

        </div>

        <div className="flex-1 overflow-y-auto p-2">
          <SidebarNav />
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex flex-col">

        {/* 🔥 TOP BAR */}
        <div className="h-14 bg-blue-600 text-white flex items-center justify-between px-6 shadow">

          {/* SCHOOL NAME */}
          <div className="font-semibold text-sm tracking-wide">
            Grain of Rice Academy
          </div>

          {/* 🔥 NAVIGATION LINKS */}
          <div className="hidden md:flex items-center gap-6 text-sm">

            {/* DASHBOARD */}
            <span
              onClick={() => navigate("/dashboard/admin")}
              className={`cursor-pointer hover:underline ${
                location.pathname === "/dashboard/admin"
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Dashboard
            </span>

            {/* STUDENTS */}
            <span
              onClick={() => navigate("/dashboard/admin/students")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/students")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Students
            </span>

            {/* CLASSES */}
            <span
              onClick={() => navigate("/dashboard/admin/classes")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/classes")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Classes
            </span>

            {/* ATTENDANCE */}
            <span
              onClick={() => navigate("/dashboard/admin/attendance")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/attendance") &&
                !isActive("/dashboard/admin/attendance-reports")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Attendance
            </span>

            {/* ✅ ATTENDANCE REPORTS */}
            <span
              onClick={() =>
                navigate("/dashboard/admin/attendance-reports")
              }
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/attendance-reports")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Attendance Reports
            </span>

            {/* TERMS */}
            <span
              onClick={() => navigate("/dashboard/admin/terms")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/terms")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Terms
            </span>

            {/* REPORTS */}
            <span
              onClick={() => navigate("/dashboard/admin/reports")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/reports")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Reports
            </span>

            {/* FEES */}
            <span
              onClick={() => navigate("/dashboard/admin/fees")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/fees")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Fees
            </span>

            {/* SPONSORSHIP */}
            <span
              onClick={() => navigate("/dashboard/admin/sponsorship")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/sponsorship")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Sponsorship
            </span>

            {/* DISCIPLINE */}
            <span
              onClick={() => navigate("/dashboard/admin/discipline")}
              className={`cursor-pointer hover:underline ${
                isActive("/dashboard/admin/discipline")
                  ? "font-bold underline"
                  : ""
              }`}
            >
              Discipline
            </span>

          </div>

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="bg-white text-blue-600 px-3 py-1 rounded text-sm font-medium hover:bg-gray-100"
          >
            Sign out
          </button>

        </div>

        {/* TOPBAR */}
        <div className="flex items-center justify-between px-6 bg-white border-b h-14 shadow-sm">
          <Topbar title={getTitle()} />
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