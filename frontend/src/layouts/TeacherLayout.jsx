import { Link, Outlet, useLocation } from "react-router-dom";

export default function TeacherLayout() {
  const location = useLocation();

  const isActive = (path) =>
    location.pathname.startsWith(path)
      ? "bg-blue-100 text-blue-700"
      : "text-gray-700";

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r">
        <div className="p-4 font-bold text-lg border-b">
          Teacher Panel
        </div>

        <nav className="p-2 space-y-1">
          <Link
            to="/teacher/assessments"
            className={`block px-3 py-2 rounded ${isActive(
              "/teacher/assessments"
            )}`}
          >
            Assessments
          </Link>

          <Link
            to="/teacher/gradebook"
            className={`block px-3 py-2 rounded ${isActive(
              "/teacher/gradebook"
            )}`}
          >
            Gradebook
          </Link>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6">
        <Outlet />
      </main>
    </div>
  );
}
