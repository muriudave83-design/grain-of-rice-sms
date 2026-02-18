import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function ParentReportCardList() {
  const [reportCards, setReportCards] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReportCards() {
      try {
        const res = await api.get("/report-cards/parent");

        const publishedOnly = (res.data || []).filter(
          (rc) => rc.status === "published"
        );

        setReportCards(publishedOnly);
      } catch (err) {
        if (err.response?.status === 403) {
          setError("You are not authorized to view report cards.");
        } else {
          setError("Failed to load report cards.");
        }
      } finally {
        setLoading(false);
      }
    }

    fetchReportCards();
  }, []);

  if (loading) return <div className="p-4">Loading...</div>;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (reportCards.length === 0)
    return <div className="p-4">No published report cards available.</div>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-semibold mb-4">Children Report Cards</h1>

      <div className="space-y-2">
        {reportCards.map((rc) => (
          <div
            key={rc.id}
            onClick={() => navigate(`/parent/reportcards/${rc.id}`)}
            className="border rounded p-3 cursor-pointer hover:bg-gray-50"
          >
            <div className="font-medium">
              {rc.student?.name} — {rc.term?.name}
            </div>
            <div className="text-sm text-gray-600">
              {rc.class?.name} | Avg: {rc.average ?? "—"} | Pos:{" "}
              {rc.gradePosition ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
