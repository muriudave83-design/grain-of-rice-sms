import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../../services/apiClient";

export default function ParentReportCards() {
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [student, setStudent] = useState(null);
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReportCards() {
      if (!studentId) {
        setError(
          "No child selected. Please select a child from the Parent Dashboard."
        );
        setLoading(false);
        return;
      }

      try {
        // Parent-safe endpoint
        const res = await api.get("/report-cards/parent");

        // Backend may return either:
        // { student, reportCards }
        // or just an array of reportCards
        if (Array.isArray(res.data)) {
          setReportCards(res.data);
        } else {
          setStudent(res.data.student || null);
          setReportCards(res.data.reportCards || []);
        }
      } catch (err) {
        console.error("Report card load error:", err);

        if (err.response?.status === 403) {
          setError("You are not authorized to view these report cards.");
        } else if (err.response?.status === 404) {
          setError("No report cards found for this student.");
        } else {
          setError("Failed to load report cards.");
        }
      } finally {
        setLoading(false);
      }
    }

    loadReportCards();
  }, [studentId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">Report Cards</h1>

      {student && (
        <p className="text-gray-600 mb-6">
          Student:{" "}
          <strong>
            {student.firstName} {student.lastName}
          </strong>
        </p>
      )}

      {reportCards.length === 0 ? (
        <div className="text-gray-600">
          No published report cards available.
        </div>
      ) : (
        <div className="space-y-4">
          {reportCards.map((rc) => (
            <div
              key={rc.id}
              className="border rounded p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium">{rc.term?.name || "Term"}</p>
                <p className="text-sm text-gray-600">
                  {rc.class?.name || "Class"}
                </p>
                <p className="text-sm text-gray-500">
                  Average: {rc.average ?? "—"}
                </p>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/parent/report-cards/${rc.id}?studentId=${studentId}`}
                  className="border px-4 py-2 rounded"
                >
                  View
                </Link>

                <a
                  href={`/api/report-cards/${rc.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-blue-600 text-white px-4 py-2 rounded"
                >
                  Download PDF
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
