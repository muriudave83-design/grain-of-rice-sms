import { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import api from "@/services/apiClient";

export default function ParentReportCardView() {
  // In Option A, :id === termId
  const { id: termId } = useParams();
  const [searchParams] = useSearchParams();
  const studentId = searchParams.get("studentId");

  const [reportCard, setReportCard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      if (!studentId) {
        setError("Missing student context.");
        setLoading(false);
        return;
      }

      try {
        /**
         * Backend contract (CONFIRMED):
         * GET /report-cards/student/:studentId/term/:termId
         * - Parent ownership enforced
         * - Published-only enforced
         */
        const res = await api.get(
          `/report-cards/student/${studentId}/term/${termId}`
        );

        setReportCard(res.data);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view this report card.");
        } else if (err.response?.status === 404) {
          setError("Report card not found.");
        } else {
          setError("Failed to load report card.");
        }
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [studentId, termId]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!reportCard) return null;

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Report Card</h1>
          <p className="text-gray-600">
            {reportCard.student?.name}
            {" · "}
            {reportCard.class?.name}
            {" · "}
            {reportCard.term?.name}
          </p>
        </div>

        <a
          href={`/api/report-cards/${reportCard.id}/pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Download PDF
        </a>
      </div>

      {/* Subjects */}
      <div className="border rounded mb-6">
        <table className="w-full border-collapse">
          <thead className="bg-gray-100">
            <tr className="border-b">
              <th className="text-left py-3 px-4">Subject</th>
              <th className="text-left py-3 px-4 w-40">Final Score</th>
            </tr>
          </thead>
          <tbody>
            {reportCard.subjects?.length ? (
              reportCard.subjects.map((s) => (
                <tr key={s.subjectId} className="border-b">
                  <td className="py-3 px-4">{s.subject?.name}</td>
                  <td className="py-3 px-4">{s.finalScore ?? "-"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="py-4 px-4 text-gray-600">
                  No subjects available.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Total Score</p>
          <p className="text-lg font-semibold">
            {reportCard.totalScore ?? "-"}
          </p>
        </div>
        <div className="border rounded p-4">
          <p className="text-sm text-gray-600">Average</p>
          <p className="text-lg font-semibold">
            {reportCard.average ?? "-"}
          </p>
        </div>
      </div>

      {/* Teacher Comment */}
      <div className="border rounded p-4 mb-6">
        <h3 className="font-medium mb-2">Teacher Comment</h3>
        <p className="bg-gray-50 p-3 rounded">
          {reportCard.comments || "No comment provided."}
        </p>
      </div>

      <Link
        to={`/parent/report-cards?studentId=${studentId}`}
        className="inline-block border px-4 py-2 rounded"
      >
        Back to Report Cards
      </Link>
    </div>
  );
}
