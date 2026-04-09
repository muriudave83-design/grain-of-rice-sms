import React, { useState } from "react";
import { NavLink } from "react-router-dom";

const BASE_PATH = "/dashboard/admin";

export default function SidebarNav() {
  const [open, setOpen] = useState({
    management: true,
    academics: true,
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

            {/* ✅ ADDED: Parents */}
            <NavLink to={path("parents")} className={linkClass}>
              👪 Parents
            </NavLink>

            <NavLink to={path("teachers")} className={linkClass}>
              👩‍🏫 Teachers
            </NavLink>

            <NavLink to={path("classes")} className={linkClass}>
              🏫 Classes
            </NavLink>

            <NavLink to={path("attendance")} className={linkClass}>
              📅 Attendance
            </NavLink>

            <NavLink to="/dashboard/admin/archived" className={linkClass}>
              <span>🗂️</span> Archived
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
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="mt-6 text-xs text-gray-400">
        v0.1 — Demo
      </div>

    </nav>
  );
}