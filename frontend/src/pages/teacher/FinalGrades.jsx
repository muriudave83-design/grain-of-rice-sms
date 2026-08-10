import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import BackButton from "../../components/BackButton";
import { formatGrade } from "../../utils/grading";

export default function FinalGrades() {
  const { classId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const termIdRaw = searchParams.get("termId");
  const termId = termIdRaw ? Number(termIdRaw) : null;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classId || !termId) return;
    fetchData();
  }, [classId, termId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const res = await apiClient.get(
        `/teacher/final-grades/${classId}?termId=${termId}`
      );

      setData(res.data || []);
    } catch (err) {
      console.error("Final Grades fetch error:", err);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  if (!termId) {
    return (
      <div className="p-6 text-red-500">
        <BackButton />
        Missing term. Please go back and select a term.
      </div>
    );
  }

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <BackButton />

      {/* 🧱 PAGE STRUCTURE */}
      <h1 className="text-2xl font-bold mb-1">Final Grades</h1>
      <p className="text-sm text-gray-500 mb-4">
        Class: {classId} — Term {termId}
      </p>

      {/* 🔘 ACTIONS */}
      <div className="mb-4 flex gap-2">
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          Publish Final Grades
        </button>

        <button className="bg-gray-200 px-4 py-2 rounded">
          Export (Coming Soon)
        </button>

        <button
          onClick={() => navigate("/teacher/classes")}
          className="bg-gray-100 px-4 py-2 rounded"
        >
          Back to Classes
        </button>
      </div>

      {data.length === 0 ? (
        <p>No students found.</p>
      ) : (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
          }}
        >
          <thead>
            <tr>
              <th style={thStyle}>#</th>
              <th style={thStyle}>Student Name</th>
              <th style={thStyle}>Average (%)</th>
              <th style={thStyle}>Grade</th>
              <th style={thStyle}>Position</th>
              <th style={thStyle}>Remarks</th>
            </tr>
          </thead>

          <tbody>
            {data.map((student, index) => {
              const grade = student.letter;
              const avg = student.average;

              return (
                <tr
                  key={student.studentId}
                  style={{
                    background: index === 0 ? "#f9f9f9" : "transparent",
                  }}
                >
                  <td style={tdStyle}>{index + 1}</td>

                  <td style={tdStyle}>{student.name}</td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {avg.toFixed(1)}%
                  </td>

                  <td
                    style={{
                      ...tdStyle,
                      fontWeight: "bold",
                      color: grade === "F" ? "red" : "black",
                      textAlign: "center",
                    }}
                  >
                    {formatGrade(grade, "-")}
                  </td>

                  <td style={{ ...tdStyle, textAlign: "center" }}>
                    {student.position ?? "-"}
                  </td>

                  <td style={tdStyle}>
                    {student.remarks ?? "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* 🎨 SIMPLE STYLES (INLINE, CLEAN) */

const thStyle = {
  background: "#f5f5f5",
  padding: "10px",
  textAlign: "left",
  fontWeight: 600,
  borderBottom: "1px solid #ddd",
};

const tdStyle = {
  padding: "10px",
  borderBottom: "1px solid #eee",
};
