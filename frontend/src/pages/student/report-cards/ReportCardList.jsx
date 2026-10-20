import { useEffect, useState } from "react";
import api from "@/services/apiClient";

export default function StudentReportCardList() {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchReportCards() {
      try {
        const res = await api.get("/report-cards/student");

        // Defensive: show ONLY published cards
        const publishedOnly = (res.data || []).filter(
          (rc) => rc.status === "PUBLISHED"
        );

        setReportCards(publishedOnly);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view report cards.");
        } else {
          setError("Failed to load report cards. Please try again.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchReportCards();
  }, []);

  async function downloadReportCard(reportCardId) {
    try {
      const response = await api.get(`/report-cards/${reportCardId}/pdf`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = `report-card-${reportCardId}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setError("Failed to download the report card.");
    }
  }

  if (loading) {
    return <div className="p-4">Loading report cards...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-600">{error}</div>;
  }

  if (reportCards.length === 0) {
    return (
      <div className="p-4 text-gray-600">
        No published report cards available.
      </div>
    );
  }

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">My Report Cards</h1>

      <div className="space-y-2">
        {reportCards.map((rc) => (
          <div
            key={rc.id}
            className="border rounded p-3 flex items-center justify-between gap-4"
          >
            <div className="font-medium">
              {rc.term?.name} — {rc.class?.name}
            </div>
            <div className="text-sm text-gray-600">
              Average: {rc.average == null ? "—" : `${Number(rc.average).toFixed(1)}%`}
            </div>
            <button type="button" onClick={() => downloadReportCard(rc.id)} className="rounded bg-blue-600 px-3 py-2 text-white">
              Download PDF
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
