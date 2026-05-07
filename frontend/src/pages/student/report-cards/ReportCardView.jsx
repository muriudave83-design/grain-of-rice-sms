import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/apiClient";

export default function StudentReportCardView() {
  const { id } = useParams();
  const [reportCard, setReportCard] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReportCard() {
      try {
        const res = await api.get(`/report-cards/${id}`);

        if (res.data.status !== "published") {
          setError("This report card is not available.");
          return;
        }

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

  const downloadPdf = () => {
    window.open(`/api/report-cards/${id}/pdf`, "_blank");
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!reportCard) return null;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-2">
        {reportCard.term?.name} — {reportCard.class?.name}
      </h1>

      <div className="mb-4 text-gray-700">
        Average: {reportCard.average ?? "—"} | Absent: {reportCard.attendanceAbsent ?? 0} days | Position:{" "}
        {reportCard.gradePosition ?? "—"}
      </div>

      <table className="w-full border mb-4">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Subject</th>
            <th className="border p-2 text-left">Score</th>
          </tr>
        </thead>
        <tbody>
          {reportCard.subjects?.map((s) => (
            <tr key={s.id}>
              <td className="border p-2">{s.subject?.name}</td>
              <td className="border p-2">{s.finalScore}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        onClick={downloadPdf}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Download PDF
      </button>
    </div>
  );
}
