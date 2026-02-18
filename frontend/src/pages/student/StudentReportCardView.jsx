import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/apiClient";
import { openReportCardPdf } from "@/utils/openReportCardPdf";

export default function StudentReportCardView() {
  const { studentId, termId } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const res = await api.get(
        `/student/report-cards/${studentId}/term/${termId}`
      );
      setData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load report card");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!data) return <div className="p-6">No data</div>;

  const reportCardId = data?.reportCard?.id;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Report Card</h1>

        {reportCardId && (
          <button
            onClick={() => openReportCardPdf(reportCardId)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open PDF
          </button>
        )}
      </div>

      <pre className="bg-gray-50 p-4 rounded text-sm overflow-auto">
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  );
}
