import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function StudentReportCardList() {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReportCards() {
      try {
        const res = await api.get("/report-cards/student");

        // Defensive: show ONLY published cards
        const publishedOnly = (res.data || []).filter(
          (rc) => rc.status === "published"
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
            onClick={() => navigate(`/student/reportcards/${rc.id}`)}
            className="border rounded p-3 cursor-pointer hover:bg-gray-50"
          >
            <div className="font-medium">
              {rc.term?.name} — {rc.class?.name}
            </div>
            <div className="text-sm text-gray-600">
              Average: {rc.average ?? "—"} | Position:{" "}
              {rc.gradePosition ?? "—"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
