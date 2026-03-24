import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const BASE_PATH = "/dashboard/admin";

export default function SidebarNav() {
  const [open, setOpen] = useState({
    management: true,
    academics: true,
    attendance: true,
    // 🔥 removed finance state
  });

  const toggle = (section) => {
    setOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-3 py-2 rounded-md mb-1 text-sm transition ${
      isActive
        ? "bg-slate-100 text-slate-900 font-semibold"
        : "text-slate-600 hover:bg-gray-50"
    }`;

  const path = (p) => (p ? `${BASE_PATH}/${p}` : BASE_PATH);

  return (
    <nav className="p-3 flex-1 overflow-y-auto">

      {/* DASHBOARD */}
      <NavLink to={BASE_PATH} end className={linkClass}>
        <span>🏠</span> Dashboard
      </NavLink>

      {/* MANAGEMENT */}
      <div className="mt-4">
        <button
          onClick={() => toggle("management")}
          className="w-full text-left text-xs font-bold text-gray-500 uppercase tracking-wide mb-2"
        >
          Management
        </button>

        {open.management && (
          <div className="ml-2">
            <NavLink to={path("users")} className={linkClass}>
              👤 Users
            </NavLink>

            <NavLink to={path("students")} className={linkClass}>
              🎓 Students
            </NavLink>

            <NavLink to={path("teachers")} className={linkClass}>
              👩‍🏫 Teachers
            </NavLink>

            <NavLink to={path("classes")} className={linkClass}>
              🏫 Classes
            </NavLink>
          </div>
        )}
      </div>

      {/* ACADEMICS */}
      <div className="mt-4">
        <button
          onClick={() => toggle("academics")}
          className="w-full text-left text-xs font-bold text-gray-500 uppercase tracking-wide mb-2"
        >
          Academics
        </button>

        {open.academics && (
          <div className="ml-2">
            <NavLink to={path("subjects")} className={linkClass}>
              📚 Subjects
            </NavLink>

            <NavLink to={path("categories")} className={linkClass}>
              🗂 Categories
            </NavLink>

            <NavLink to={path("teacher-subjects")} className={linkClass}>
              🧑‍🏫 Teacher Assignments
            </NavLink>

            <NavLink to={path("class-subjects")} className={linkClass}>
              🏫 Class Subject Assignment
            </NavLink>

            {/* ❌ REMOVED GRADES */}

            <NavLink to={path("exams")} className={linkClass}>
              📊 Exams
            </NavLink>
          </div>
        )}
      </div>

      {/* ATTENDANCE */}
      <div className="mt-4">
        <button
          onClick={() => toggle("attendance")}
          className="w-full text-left text-xs font-bold text-gray-500 uppercase tracking-wide mb-2"
        >
          Attendance
        </button>

        {open.attendance && (
          <div className="ml-2">
            <NavLink to={path("attendance")} className={linkClass}>
              ✅ Attendance
            </NavLink>

            {/* ❌ REMOVED ATTENDANCE ANALYTICS */}
          </div>
        )}
      </div>

      {/* ❌ FULL FINANCE SECTION REMOVED */}

      {/* FOOTER */}
      <div className="mt-6 text-xs text-gray-400">
        v0.1 — Demo
      </div>

    </nav>
  );
}