import { useEffect, useState } from "react";
import axios from "../../../api/axios";

export default function Gradebook() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    axios
      .get("/api/gradebook?classId=1&subjectId=1&termId=1")
      .then((res) => {
        console.log("GRADEBOOK:", res.data);
        setData(res.data);
      })
      .catch((err) => {
        console.error(err);
        setError("Failed to load gradebook");
      });
  }, []);

  const handleScoreChange = async (studentId, assessmentId, value) => {
    const newScore =
      value === "" || value === null ? null : Number(value);

    setData((prev) => {
      if (!prev) return prev;

      const updatedStudents = prev.students.map((student) => {
        if (student.id !== studentId) return student;

        const updatedScores = {
          ...student.scores,
          [assessmentId]: newScore,
        };

        // 🔥 Recalculate average
        const validScores = Object.values(updatedScores).filter(
          (s) => s !== null && s !== undefined
        );

        const avg =
          validScores.length > 0
            ? validScores.reduce((a, b) => a + b, 0) /
              validScores.length
            : null;

        // 🔥 Recalculate missing
        const missingCount =
          prev.assessments.length - validScores.length;

        return {
          ...student,
          scores: updatedScores,
          average: avg,
          missingCount,
        };
      });

      return { ...prev, students: updatedStudents };
    });

    try {
      await axios.post("/api/gradebook/score", {
        studentId,
        assessmentId,
        score: newScore,
      });
    } catch (err) {
      console.error("Failed to save score", err);
    }
  };

  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!data) return <div className="p-4">Loading gradebook...</div>;

  const students = data.students || [];
  const assessments = data.assessments || [];

  return (
    <div className="p-4 overflow-x-auto">
      <h2 className="text-xl mb-4">Gradebook</h2>

      <table className="border border-collapse w-full">
        <thead>
          <tr>
            <th className="border p-2">Student</th>

            {assessments.map((a) => (
              <th key={a.id} className="border p-2">
                {a.title}
              </th>
            ))}

            <th className="border p-2">Avg</th>
            <th className="border p-2">Missing</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <td className="border p-2">
                {student.name ||
                  `${student.firstName || ""} ${student.lastName || ""}`}
              </td>

              {assessments.map((a) => {
                const score = student.scores?.[a.id] ?? "";

                return (
                  <td key={a.id} className="border p-2 text-center">
                    <input
                      type="number"
                      value={score} // ✅ controlled input
                      className="w-16 text-center border rounded"
                      onChange={(e) =>
                        handleScoreChange(
                          student.id,
                          a.id,
                          e.target.value
                        )
                      }
                    />
                  </td>
                );
              })}

              <td className="border p-2 text-center">
                {student.average != null
                  ? (student.average * 100).toFixed(0) + "%"
                  : "-"}
              </td>

              <td className="border p-2 text-center">
                {student.missingCount ?? "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {students.length === 0 && (
        <div className="mt-4 text-gray-500">
          No students found for this class.
        </div>
      )}
    </div>
  );
}