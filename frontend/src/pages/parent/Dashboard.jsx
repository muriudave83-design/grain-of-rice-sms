import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function ParentDashboard() {
  const [parent, setParent] = useState(null);
  const [children, setChildren] = useState([]);
  const [selectedChildId, setSelectedChildId] = useState(null);
  const [activeTerm, setActiveTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchDashboard() {
      try {
        /**
         * Expected backend behavior:
         * - /parent/me
         *     → authenticated parent profile
         * - /parent/children
         *     → students linked to this parent only
         * - /terms/active
         *     → active academic term
         */
        const [meRes, childrenRes, termRes] = await Promise.all([
          api.get("/parent/me"),
          api.get("/parent/children"),
          api.get("/terms/active"),
        ]);

        setParent(meRes.data);
        setChildren(childrenRes.data || []);
        setActiveTerm(termRes.data || null);

        // Auto-select child if only one exists
        if (childrenRes.data?.length === 1) {
          setSelectedChildId(childrenRes.data[0].id);
        }
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view this page.");
        } else {
          setError("Failed to load parent dashboard.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  function handleSelectChild(id) {
    setSelectedChildId(id);
  }

  function goTo(path) {
    if (!selectedChildId) return;
    navigate(`${path}?studentId=${selectedChildId}`);
  }

  if (loading) {
    return <div className="p-6">Loading parent dashboard...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!parent) {
    return null;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-1">
        Welcome, {parent.name}
      </h1>
      <p className="text-sm text-gray-600 mb-6">
        Parent Dashboard
      </p>

      {/* Active Term */}
      <div className="mb-6 text-sm text-gray-700">
        <span className="font-medium">Active Term:</span>{" "}
        {activeTerm?.name || "—"}
      </div>

      {/* Child Selector */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold mb-2">
          Select Child
        </h2>

        {children.length === 0 ? (
          <p className="text-sm text-gray-600">
            No students linked to your account.
          </p>
        ) : (
          <div className="space-y-2">
            {children.map((c) => (
              <label
                key={c.id}
                className="flex items-center space-x-2 text-sm"
              >
                <input
                  type="radio"
                  name="child"
                  checked={selectedChildId === c.id}
                  onChange={() => handleSelectChild(c.id)}
                />
                <span>{c.name}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="space-y-2">
        <button
          disabled={!selectedChildId}
          onClick={() => goTo("/parent/subjects")}
          className="block w-full text-left border rounded p-3 hover:bg-gray-50 disabled:opacity-50"
        >
          View Subjects
        </button>

        <button
          disabled={!selectedChildId}
          onClick={() => goTo("/parent/attendance")}
          className="block w-full text-left border rounded p-3 hover:bg-gray-50 disabled:opacity-50"
        >
          View Attendance
        </button>

        <button
          disabled={!selectedChildId}
          onClick={() => goTo("/parent/report-cards")}
          className="block w-full text-left border rounded p-3 hover:bg-gray-50 disabled:opacity-50"
        >
          View Report Cards
        </button>
      </div>
    </div>
  );
}
