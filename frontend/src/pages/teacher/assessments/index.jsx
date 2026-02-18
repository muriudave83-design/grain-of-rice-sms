import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/apiClient";

export default function TeacherAssessments() {
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAssessments();
  }, []);

  async function fetchAssessments() {
    setLoading(true);
    setError(null);

    try {
      const res = await api.get("/assessments/mine");
      setAssessments(res.data);
    } catch (err) {
      console.error("Failed to load assessments", err);
      setError("Failed to load assessments.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteAssessment(a) {
    if (!window.confirm(`Delete assessment "${a.title}"?`)) return;

    try {
      await api.delete(`/assessments/${a.id}`);
      fetchAssessments();
    } catch (err) {
      console.error("Failed to delete assessment", err);
      alert("Failed to delete assessment.");
    }
  }

  async function submitAssessment(id) {
    if (!window.confirm("Submit and lock this assessment?")) return;

    try {
      await api.patch(`/assessments/${id}/submit`);
      fetchAssessments();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  }

  function formatDate(date) {
    return new Date(date).toLocaleDateString();
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">My Assessments</h1>

        <Link
          to="/teacher/assessments/create"
          className="px-4 py-2 bg-blue-600 text-white rounded text-sm"
        >
          Create Assessment
        </Link>
      </div>

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Title</th>
              <th className="p-3 text-left">Subject</th>
              <th className="p-3 text-left">Class</th>
              <th className="p-3 text-left">Term</th>
              <th className="p-3 text-left">Max Score</th>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 w-56"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  Loading assessments...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : assessments.length === 0 ? (
              <tr>
                <td colSpan="8" className="p-4 text-center text-gray-500">
                  No assessments created yet.
                </td>
              </tr>
            ) : (
              assessments.map((a) => (
                <tr key={a.id} className="border-t">
                  <td className="p-3">{a.title}</td>

                  {/* SAFE OBJECT ACCESS */}
                  <td className="p-3">
                    {a.subject?.name ?? "—"}
                  </td>

                  <td className="p-3">
                    {a.class?.name ??
                      a.subject?.class?.name ??
                      "—"}
                  </td>

                  {/* 🔥 FIXED — WAS CRASHING */}
                  <td className="p-3">
                    {a.term?.name ?? "—"}
                  </td>

                  {/* 🔥 FIXED — backend uses maxScore */}
                  <td className="p-3">
                    {a.maxScore ?? "—"}
                  </td>

                  <td className="p-3">
                    {a.date ? formatDate(a.date) : "—"}
                  </td>

                  <td className="p-3 text-xs">
                    {a.status}
                  </td>

                  <td className="p-3 space-x-2 text-right">
                    <Link
                      to={`/teacher/assessments/${a.id}/scores`}
                      className="text-green-600 text-xs"
                    >
                      Scores
                    </Link>

                    <Link
                      to={`/teacher/assessments/${a.id}/review`}
                      className="text-purple-600 text-xs"
                    >
                      Review
                    </Link>

                    {a.status === "DRAFT" && (
                      <button
                        onClick={() => submitAssessment(a.id)}
                        className="text-orange-600 text-xs"
                      >
                        Submit
                      </button>
                    )}

                    {a.status === "SUBMITTED" && (
                      <span className="text-gray-500 text-xs">
                        Waiting publish
                      </span>
                    )}

                    {a.status === "PUBLISHED" && (
                      <span className="text-green-600 text-xs">
                        Published
                      </span>
                    )}

                    <button
                      onClick={() => deleteAssessment(a)}
                      className="text-red-600 text-xs"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
