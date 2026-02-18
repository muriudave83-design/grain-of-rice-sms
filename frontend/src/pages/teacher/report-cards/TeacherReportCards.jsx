import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function TeacherReportCards() {
  const [reportCards, setReportCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function fetchReportCards() {
      try {
        const res = await api.get("/report-cards/teacher");
        setReportCards(res.data || []);
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

  if (loading) return <div className="p-6">Loading report cards…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  if (reportCards.length === 0) {
    return <div className="p-6">No report cards available for your classes.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">My Class Report Cards</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Student</th>
            <th className="text-left py-2">Class</th>
            <th className="text-left py-2">Term</th>
            <th className="text-left py-2">Average</th>
            <th className="text-left py-2">Position</th>
            <th className="text-left py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {reportCards.map((rc) => (
            <tr
              key={rc.id}
              className="border-b cursor-pointer hover:bg-gray-50"
              onClick={() => navigate(`/teacher/reportcards/${rc.id}`)}
            >
              <td className="py-2">{rc.student?.name}</td>
              <td className="py-2">{rc.class?.name}</td>
              <td className="py-2">{rc.term?.name}</td>
              <td className="py-2">{rc.average ?? "-"}</td>
              <td className="py-2">{rc.gradePosition ?? "-"}</td>
              <td className="py-2">
                <span
                  className={`px-2 py-1 rounded text-sm ${
                    rc.status === "GENERATED"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-green-100 text-green-800"
                  }`}
                >
                  {rc.status === "GENERATED" ? "Generated" : "Published"}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
