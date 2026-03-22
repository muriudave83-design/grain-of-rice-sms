import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/services/apiClient";

export default function StudentReportCardsList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchList();
  }, []);

  async function fetchList() {
  try {
    setLoading(true);

    const res = await api.get("/report-cards/me");

    console.log("📦 REPORT CARDS RESPONSE:", res.data);

    setItems(
      Array.isArray(res.data)
        ? res.data
        : res.data
        ? [res.data]
        : []
    );
    
  } catch (err) {
    console.error("Failed to load student report cards", err);
    setError("Unable to load report cards");
  } finally {
    setLoading(false);
  }
}

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">My Report Cards</h1>

      <div className="bg-white border rounded overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Term</th>
              <th className="p-3 text-left">Class</th>
              <th className="p-3 text-left">Status</th>
              <th className="p-3 w-24"></th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  Loading report cards...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-red-600">
                  {error}
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No published report cards available.
                </td>
              </tr>
            ) : (
              items.map((rc) => (
                <tr key={rc.termId} className="border-t">
                  <td className="p-3">{rc.termName}</td>
                  <td className="p-3">{rc.className}</td>
                  <td className="p-3">Published</td>
                  <td className="p-3 text-right">
                    <Link
                      to={`/student/report-cards/${rc.termId}`}
                      className="text-blue-600 text-xs"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
