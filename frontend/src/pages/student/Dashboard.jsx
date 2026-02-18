import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/apiClient";

export default function StudentDashboard() {
  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState({
    activeTerm: null,
    subjectCount: 0,
    attendanceCount: 0,
    reportCardCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        /**
         * Expected backend behavior:
         * - /student/me → authenticated student profile
         * - /student/dashboard → derived summary for the logged-in student
         *   (no studentId passed from frontend)
         */
        const [meRes, summaryRes] = await Promise.all([
          api.get("/student/me"),
          api.get("/student/dashboard"),
        ]);

        setStudent(meRes.data);
        setSummary({
          activeTerm: summaryRes.data.activeTerm || null,
          subjectCount: summaryRes.data.subjectCount || 0,
          attendanceCount: summaryRes.data.attendanceCount || 0,
          reportCardCount: summaryRes.data.reportCardCount || 0,
        });
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view this page.");
        } else {
          setError("Failed to load student dashboard.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!student) {
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">
        Welcome, {student.name}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Student Dashboard
      </p>

      {/* Academic Context */}
      <div className="mb-6">
        <p className="text-sm text-gray-700">
          <span className="font-medium">Active Term:</span>{" "}
          {summary.activeTerm?.name || "—"}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">My Subjects</div>
          <div className="text-2xl font-semibold">
            {summary.subjectCount}
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Attendance Records</div>
          <div className="text-2xl font-semibold">
            {summary.attendanceCount}
          </div>
        </div>

        <div className="border rounded p-4">
          <div className="text-sm text-gray-500">Report Cards</div>
          <div className="text-2xl font-semibold">
            {summary.reportCardCount}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="space-y-2">
        <Link
          to="/student/subjects"
          className="block border rounded p-3 hover:bg-gray-50"
        >
          View My Subjects
        </Link>

        <Link
          to="/student/attendance"
          className="block border rounded p-3 hover:bg-gray-50"
        >
          View My Attendance
        </Link>

        <Link
          to="/student/reportcards"
          className="block border rounded p-3 hover:bg-gray-50"
        >
          View My Report Cards
        </Link>
      </div>
    </div>
  );
}
