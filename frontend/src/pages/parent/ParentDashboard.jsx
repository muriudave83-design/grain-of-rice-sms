import { useEffect, useState } from "react";
import api from "@/services/apiClient";
import { Link } from "react-router-dom";
import { formatGrade } from "@/utils/grading";
import { useAuth } from "@/context/AuthContext"; // ✅ IMPORT

const ParentDashboard = () => {
  const { logout } = useAuth(); // ✅ GET LOGOUT
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchReportCards = async () => {
      try {
        const res = await api.get("/report-cards/me");

        console.log("👨‍👩‍👧 CHILDREN DATA:", res.data);

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

      {/* 🔥 HEADER WITH LOGOUT */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">My Children</h1>

        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Logout
        </button>
      </div>

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
                  {child.overallAverage > 0
                    ? child.overallAverage
                    : "-"}
                </span>
              </p>

              <p className="text-sm mb-2">
                Overall Grade:{" "}
                <span className="font-medium">
                  {child.overallGrade !== "N/A"
                    ? formatGrade(child.overallGrade, "-")
                    : "-"}
                </span>
              </p>

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
