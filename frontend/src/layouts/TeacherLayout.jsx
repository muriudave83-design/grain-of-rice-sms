import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";

export default function TeacherLayout() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    location.pathname.startsWith(path)
      ? "bg-blue-100 text-blue-700"
      : "text-gray-700 hover:bg-gray-100";

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-gray-100">

      {/* Sidebar */}
      <aside className="w-64 bg-white border-r flex flex-col">

        {/* 🔥 HEADER (LOGO + TITLE) */}
        <div className="p-4 border-b flex items-center gap-3">
          <img
            src="/logo.png"
            alt="School Logo"
            className="h-10 w-10 object-contain"
          />
          <div>
            <div className="font-bold text-lg leading-tight">
              Grain of Rice SMS
            </div>
            <div className="text-sm text-gray-500">
              Teacher
            </div>
          </div>
        </div>

        {/* NAV */}
        <nav className="p-2 space-y-1">

          {/* Gradebook */}
          <Link
            to="/teacher/gradebook"
            className={`block px-3 py-2 rounded ${isActive(
              "/teacher/gradebook"
            )}`}
          >
            📘 Gradebook
          </Link>

          {/* Reports 🔥 NEW */}
          <Link
            to="/teacher/reports"
            className={`block px-3 py-2 rounded ${isActive(
              "/teacher/reports"
            )}`}
          >
            📊 Reports
          </Link>

          {/* Attendance */}
          <Link
            to="/teacher/attendance"
            className={`block px-3 py-2 rounded ${isActive(
              "/teacher/attendance"
            )}`}
          >
            📅 Attendance
          </Link>
        </nav>
      </aside>

      {/* Right Side */}
      <div className="flex flex-col flex-1">

        {/* Header */}
        <header className="flex items-center p-4 bg-white border-b shadow-sm">
          <h1 className="text-lg font-semibold">
            Teacher Panel
          </h1>

          <button
            onClick={handleLogout}
            className="ml-auto bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
          >
            Logout
          </button>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>

      </div>
    </div>
  );
}