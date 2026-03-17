import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function TeacherAssessments() {
  const navigate = useNavigate();

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

  function getStatusBadge(status) {
    if (status === "DRAFT") {
      return (
        <span className="px-2 py-1 text-xs rounded bg-yellow-100 text-yellow-700">
          Draft
        </span>
      );
    }

    if (status === "SUBMITTED") {
      return (
        <span className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700">
          Submitted
        </span>
      );
    }

    if (status === "PUBLISHED") {
      return (
        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
          Published
        </span>
      );
    }

    return (
      <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
        {status}
      </span>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-600">
        Teacher / Assessments
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher")}
        className="px-3 py-1 border rounded"
      >
        ← Back to Dashboard
      </button>

      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">My Assessments</h1>

        <div className="flex gap-2">
          <Link
            to="/teacher/assessments/create"
            className="px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
          >
            Create Assessment
          </Link>

          <Link
            to="/teacher/homework/create"
            className="px-4 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
          >
            Create Homework
          </Link>
        </div>
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
              <th className="p-3 text-right">Actions</th>
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
                <tr key={a.id} className="border-t hover:bg-gray-50">
                  <td className="p-3 font-medium">{a.title}</td>

                  <td className="p-3">{a.subject?.name ?? "—"}</td>

                  <td className="p-3">
                    {a.class?.name ?? a.subject?.class?.name ?? "—"}
                  </td>

                  <td className="p-3">{a.term?.name ?? "—"}</td>

                  <td className="p-3">{a.maxScore ?? "—"}</td>

                  <td className="p-3">
                    {a.date ? formatDate(a.date) : "—"}
                  </td>

                  <td className="p-3">{getStatusBadge(a.status)}</td>

                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2 flex-wrap">
                      <Link
                        to={`/teacher/assessments/${a.id}/scores`}
                        className="px-2 py-1 text-xs rounded bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        Enter Scores
                      </Link>

                      <Link
                        to={`/teacher/assessments/${a.id}/review`}
                        className="px-2 py-1 text-xs rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Review
                      </Link>

                      {a.status === "DRAFT" && (
                        <button
                          onClick={() => submitAssessment(a.id)}
                          className="px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 hover:bg-purple-200"
                        >
                          Submit
                        </button>
                      )}

                      {a.status === "SUBMITTED" && (
                        <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                          Waiting publish
                        </span>
                      )}

                      {a.status === "PUBLISHED" && (
                        <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-700">
                          Published
                        </span>
                      )}

                      <button
                        onClick={() => deleteAssessment(a)}
                        className="px-2 py-1 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200"
                      >
                        Delete
                      </button>
                    </div>
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