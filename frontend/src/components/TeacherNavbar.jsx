import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearUserCommentDrafts } from "../utils/commentDraftStore";

export default function TeacherNavbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const linkClass = (path) =>
    `px-4 py-2 rounded ${
      location.pathname.startsWith(path)
        ? "bg-blue-600 text-white"
        : "text-gray-300 hover:text-white"
    }`;

  // 🔐 Logout
  const handleLogout = () => {
    try {
      const currentUser = JSON.parse(localStorage.getItem("user") || "null");
      if (currentUser?.id) clearUserCommentDrafts(currentUser.id);
    } catch { /* malformed session is cleared below */ }
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  // 👤 Fake user (replace later with real user data)
  const userName = localStorage.getItem("userName") || "Teacher";
  const userInitial = userName.charAt(0).toUpperCase();
  let canViewSchoolGradebooks = false;
  try {
    canViewSchoolGradebooks = JSON.parse(localStorage.getItem("user") || "null")?.canViewSchoolGradebooks === true;
  } catch {
    canViewSchoolGradebooks = false;
  }

  return (
    <div className="bg-gray-900 p-3 border-b border-gray-700 flex items-center justify-between">
      
      {/* LEFT: NAV LINKS */}
      <div className="flex gap-3">
        <Link
          to="/teacher/classes"
          className={linkClass("/teacher/classes")}
        >
          Classes
        </Link>

        <Link
          to="/teacher/reports"
          className={linkClass("/teacher/reports")}
        >
          Reports
        </Link>

        {canViewSchoolGradebooks && (
          <Link
            to="/teacher/school-gradebooks"
            className={linkClass("/teacher/school-gradebooks")}
          >
            School Gradebooks
          </Link>
        )}

        <Link
          to="/teacher/attendance"
          className={linkClass("/teacher/attendance")}
        >
          Attendance
        </Link>

        <Link
          to="/teacher/discipline"
          className={linkClass("/teacher/discipline")}
        >
          Discipline
        </Link>
      </div>

      {/* RIGHT: USER + LOGOUT */}
      <div className="flex items-center gap-3">
        
        {/* Avatar */}
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
          {userInitial}
        </div>

        {/* Name */}
        <span className="text-gray-300 text-sm">{userName}</span>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600 text-sm"
        >
          Logout
        </button>
      </div>
    </div>
  );
}
