import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import API from "../../api/apiClient"; // ✅ FIX PATH

export default function StudentReportCardView() {
  const { classId, term } = useParams();

  const [studentData, setStudentData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchData();
  }, [classId, term]);

  async function fetchData() {
    try {
      setLoading(true);

      console.log("🔥 CALLING:", `/report-cards/teacher/${classId}/${term}`);
      console.log("TOKEN:", localStorage.getItem("token")); // ✅ DEBUG

      const res = await API.get(
        `/report-cards/teacher/${classId}/${term}`
      );

      console.log("🔥 AXIOS DATA:", res.data);
      setStudentData(res.data);
    } catch (err) {
      console.error("❌ ERROR:", err.response || err);
      setError("Failed to load report card");
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!studentData) return <div className="p-6">No data</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-semibold">
        Report Card — {studentData.name}
      </h1>

      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Subject</th>
            <th className="p-2 border">Average</th>
            <th className="p-2 border">Grade</th>
          </tr>
        </thead>
        <tbody>
          {studentData.subjects.map((subj, i) => (
            <tr key={i}>
              <td className="p-2 border">{subj.subject}</td>
              <td className="p-2 border">
                {subj.average?.toFixed(2) || "0.00"}
              </td>
              <td className="p-2 border">{subj.grade}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div>
        <strong>Overall Average:</strong>{" "}
        {studentData.overallAverage?.toFixed(2) || "0.00"}
      </div>

      <div>
        <strong>Overall Grade:</strong> {studentData.overallGrade}
      </div>
    </div>
  );
}