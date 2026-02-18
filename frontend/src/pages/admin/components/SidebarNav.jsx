import React from "react";
import { NavLink } from "react-router-dom";

const BASE_PATH = "/dashboard/admin";

const links = [
  { to: "", label: "Dashboard", end: true },

  // Core setup
  { to: "users", label: "Users" },
  { to: "classes", label: "Classes" },
  { to: "students", label: "Students" },

  // ✅ CLEAN FIX — Dedicated Teachers Page
  { to: "teachers", label: "Teachers" },

  // ===============================
  // ✅ ACADEMIC CORE
  // ===============================
  { to: "subjects", label: "Subjects" },

  // Teacher → Subject
  { to: "teacher-subjects", label: "Teacher Assignments" },

  // Class → Subject
  { to: "class-subjects", label: "Class Subject Assignment" },

  // Academic
  { to: "grades", label: "Grades" },
  { to: "attendance", label: "Attendance" },
  { to: "exams", label: "Exams" },

  // Finance
  { to: "fees", label: "Fees" },
  { to: "payments", label: "Payments" },
];

export default function SidebarNav() {
  return (
    <aside className="w-64 hidden md:flex flex-col border-r bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="text-lg font-bold">School SMS</div>
        <div className="text-xs text-gray-500">
          Administrator Panel
        </div>
      </div>

      {/* Navigation */}
      <nav className="p-2 flex-1 overflow-auto">
        {links.map((ln) => {
          const path = ln.to ? `${BASE_PATH}/${ln.to}` : BASE_PATH;

          return (
            <NavLink
              key={ln.label}
              to={path}
              end={ln.end}
              className={({ isActive }) =>
                `block px-3 py-2 rounded mb-1 text-sm transition-colors ${
                  isActive
                    ? "bg-slate-100 font-semibold text-slate-900"
                    : "text-slate-700 hover:bg-gray-50"
                }`
              }
            >
              {ln.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t text-xs text-gray-500">
        v0.1 — Demo
      </div>
    </aside>
  );
}
