import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/apiClient";
import AddComment from "./AddComment";

export default function TeacherReportCardView() {
  const { id } = useParams();
  const [reportCard, setReportCard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReportCard() {
      try {
        const res = await api.get(`/report-cards/${id}`);
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

    fetchReportCard();
  }, [id]);

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!reportCard) return null;

  const isGenerated = reportCard.status === "GENERATED";

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">
        Report Card — {reportCard.student?.name}
      </h1>

      <p className="mb-4 text-gray-600">
        {reportCard.class?.name} • {reportCard.term?.name}
      </p>

      {/* Subjects */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Subject</th>
            <th className="text-left py-2">Final Score</th>
          </tr>
        </thead>
        <tbody>
          {reportCard.subjects?.map((s) => (
            <tr key={s.subjectId} className="border-b">
              <td className="py-2">{s.subject?.name}</td>
              <td className="py-2">{s.finalScore ?? "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Comments */}
      <div className="mt-6">
        {isDraft ? (
          <AddComment
            reportCardId={reportCard.id}
            initialComment={reportCard.comment}
            onSaved={(updated) => setReportCard(updated)}
          />
        ) : (
          <>
            <h3 className="font-medium mb-2">Teacher Comment</h3>
            <p className="border p-3 bg-gray-50 rounded">
              {reportCard.comment || "No comment provided."}
            </p>
            <p className="mt-3 text-sm text-gray-600">
              This report card has been published and is locked.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
