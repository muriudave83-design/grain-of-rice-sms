import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/apiClient";

export default function ParentDashboard() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadChildren() {
      try {
        const res = await api.get("/parent-students");
        setChildren(res.data);
      } catch (err) {
        console.error("Failed to load children:", err);
      } finally {
        setLoading(false);
      }
    }

    loadChildren();
  }, []);

  if (loading) {
    return <div className="p-6">Loading children...</div>;
  }

  if (children.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Parent Dashboard</h1>
        <p>No children linked to this account.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Parent Dashboard</h1>

      <div className="space-y-3">
        {children.map((link) => {
          const child = link.student;

          return (
            <div
              key={child.id}
              className="border p-4 rounded flex justify-between items-center"
            >
              <div>
                <p className="font-medium">
                  {child.firstName} {child.lastName}
                </p>
                <p className="text-sm text-gray-500">
                  {child.class?.name || "No class"}
                </p>
              </div>

              <button
                onClick={() =>
                  navigate(`/parent/report-cards?studentId=${child.id}`)
                }
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                View Report Cards
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
