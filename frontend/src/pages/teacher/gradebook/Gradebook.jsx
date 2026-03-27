import { useEffect, useState, useRef } from "react";
import api from "@/services/apiClient";

export default function Gradebook() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState({});
  const [previousScores, setPreviousScores] = useState({});

  const inputRefs = useRef({});
  const debounceTimers = useRef({});

  const fetchGradebook = async () => {
    try {
      console.log("📡 Fetching gradebook...");

      const res = await api.get("/gradebook?subjectId=1"); // ✅ FIXED

      console.log("✅ Gradebook response:", res.data);

      // ✅ ALWAYS SAFE SHAPE
      setData({
        students: res.data?.students || [],
        assessments: res.data?.assessments || [],
        categories: res.data?.categories || [],
        message: res.data?.message || null,
      });

      setError(null);
    } catch (err) {
      console.error("❌ Gradebook fetch error:", err);

      // ✅ NEVER FAIL UI
      setData({
        students: [],
        assessments: [],
        categories: [],
        message: "Unable to load gradebook data",
      });

      setError(null); // ❗ don't block UI
    }
  };

  useEffect(() => {
    fetchGradebook();
  }, []);

  const getKey = (sId, aId) => `${sId}-${aId}`;

  const getScoreColor = (score, max) => {
    if (score == null || !max) return "white";
    const percent = (score / max) * 100;
    if (percent >= 75) return "#d4edda";
    if (percent >= 50) return "#fff3cd";
    return "#f8d7da";
  };

  const saveScore = async (studentId, assessmentId, score) => {
    const key = getKey(studentId, assessmentId);
    setSaving((prev) => ({ ...prev, [key]: true }));

    try {
      await api.post("/gradebook/score", {
        studentId,
        assessmentId,
        score,
      });

      setPreviousScores((prev) => ({
        ...prev,
        [key]: score,
      }));

      fetchGradebook();
    } catch (err) {
      console.error("Save failed:", err);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleScoreChange = (studentId, assessmentId, value) => {
    const newScore =
      value === "" || value === null ? null : Number(value);

    setData((prev) => {
      if (!prev) return prev;

      const updatedStudents = prev.students.map((student) => {
        if (student.studentId !== studentId) return student;

        return {
          ...student,
          scores: {
            ...student.scores,
            [assessmentId]: newScore,
          },
        };
      });

      return { ...prev, students: updatedStudents };
    });

    const key = getKey(studentId, assessmentId);

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(() => {
      saveScore(studentId, assessmentId, newScore);
    }, 500);
  };

  // ✅ NEVER FAIL UI
  if (!data) return <div className="p-4">Loading gradebook…</div>;

  const students = data.students || [];
  const assessments = data.assessments || [];

  return (
    <div className="p-4 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-2">Gradebook</h2>

      {/* ✅ SHOW MESSAGE INSTEAD OF FAIL */}
      {data.message && (
        <div className="mb-4 text-sm text-gray-600">
          {data.message}
        </div>
      )}

      {students.length === 0 && (
        <div className="text-gray-500">
          No students or data available.
        </div>
      )}

      {students.length > 0 && (
        <table className="border w-full">
          <thead>
            <tr>
              <th>Student</th>

              {assessments.map((a) => (
                <th key={a.id}>{a.title}</th>
              ))}

              <th>Final Score</th>
              <th>Missing</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student, rowIndex) => (
              <tr key={student.studentId}>
                <td>
                  {student.firstName} {student.lastName}
                </td>

                {assessments.map((a, colIndex) => {
                  const key = getKey(student.studentId, a.id);
                  const score = student.scores?.[a.id] ?? "";

                  return (
                    <td key={a.id}>
                      <input
                        ref={(el) =>
                          (inputRefs.current[`${rowIndex}-${colIndex}`] = el)
                        }
                        value={score}
                        type="number"
                        min={0}
                        max={a.maxScore}
                        onChange={(e) =>
                          handleScoreChange(
                            student.studentId,
                            a.id,
                            e.target.value
                          )
                        }
                        style={{
                          width: 60,
                          backgroundColor: getScoreColor(score, a.maxScore),
                        }}
                      />
                      {saving[key] && <span>...</span>}
                    </td>
                  );
                })}

                <td>
                  {student.finalScore != null
                    ? student.finalScore + "%"
                    : "-"}
                </td>

                <td>{student.missingCount ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}