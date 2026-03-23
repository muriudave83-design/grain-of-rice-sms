import { useEffect, useState } from "react";
import api from "@/services/apiClient";
import { Link } from "react-router-dom";

const ParentDashboard = () => {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReportCards = async () => {
      try {
        const res = await api.get("/report-cards/me");
        setChildren(res.data);
      } catch (err) {
        console.error(err);
        setError("Failed to load children");
      } finally {
        setLoading(false);
      }
    };

    fetchReportCards();
  }, []);

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">My Children</h1>

      {children.length === 0 ? (
        <p>No children found</p>
      ) : (
        <div className="grid gap-4">
          {children.map((child) => (
            <div
              key={child.studentId}
              className="p-4 border rounded-xl shadow bg-white"
            >
              <h2 className="text-lg font-semibold mb-2">
                {child.name}
              </h2>

              <p className="text-sm">
                Overall Average:{" "}
                <span className="font-medium">
                  {child.overallAverage ?? "-"}
                </span>
              </p>

              <p className="text-sm mb-2">
                Overall Grade:{" "}
                <span className="font-medium">
                  {child.overallGrade ?? "-"}
                </span>
              </p>

              {/* ✅ FIXED LINK (ROUTE PARAMS, NO QUERY PARAMS) */}
              <Link
                to={`/parent/report-cards/${child.studentId}/1`}
                className="inline-block mt-2 text-blue-600 hover:underline"
              >
                View Full Report Card →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ParentDashboard;