import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import SidebarNav from "./components/SidebarNav";
import Topbar from "./components/Topbar";
import KPIGrid from "./components/KPIGrid";
import EnrollmentChart from "./components/EnrollmentChart";
import RecentActivityTable from "./components/RecentActivityTable";

import api from "../../services/apiClient";

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    students: 0,
    teachers: 0,
    classes: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get("/admin/stats");
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load admin stats", err);
      }
    };

    fetchStats();
  }, []);

  const kpiData = [
    { label: "Total Students", value: stats.students },
    { label: "Total Teachers", value: stats.teachers },
    { label: "Active Classes", value: stats.classes },
    { label: "Avg Attendance", value: "—" },
  ];

  const enrollmentTrend = [
    { month: "Jan", students: 0 },
    { month: "Feb", students: 0 },
    { month: "Mar", students: 0 },
    { month: "Apr", students: 0 },
    { month: "May", students: 0 },
    { month: "Jun", students: 0 },
  ];

  // ✅ HONEST PLACEHOLDER — NO FAKE DATES OR DATA
  const recentActivity = [
    {
      id: 1,
      action: "System activity logs are available in Admin → Audit Logs",
      user: "SYSTEM",
      time: "",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNav />

      <div className="flex-1 flex flex-col">
        <Topbar title="Admin Dashboard" />

        <div className="p-6 overflow-y-auto space-y-6">
          {/* KPI SUMMARY */}
          <KPIGrid data={kpiData} />

          {/* CHART + QUICK ACTIONS */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="col-span-2">
              <EnrollmentChart data={enrollmentTrend} />
            </div>

            {/* QUICK ACTIONS — REAL NAVIGATION */}
            <div className="col-span-1 bg-white border rounded-lg p-4 space-y-4">
              <h3 className="text-sm font-semibold text-gray-700">
                Quick Actions
              </h3>

              <button
                onClick={() => navigate("/dashboard/admin/students")}
                className="w-full px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Student
              </button>

              <button
                onClick={() =>
                  navigate("/dashboard/admin/users?role=TEACHER")
                }
                className="w-full px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Add Teacher
              </button>

              <button
                onClick={() =>
                  navigate("/dashboard/admin/users?role=PARENT")
                }
                className="w-full px-3 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                Add Parent
              </button>
            </div>
          </div>

          {/* RECENT ACTIVITY — HONEST STATE */}
          <RecentActivityTable rows={recentActivity} />
        </div>
      </div>
    </div>
  );
}
