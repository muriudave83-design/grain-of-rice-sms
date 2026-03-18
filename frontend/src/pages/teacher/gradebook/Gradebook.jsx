import { useEffect, useState, useRef } from "react";
import axios from "../../../api/axios";

export default function Gradebook() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("ALL");
  const [saving, setSaving] = useState({});
  const [previousScores, setPreviousScores] = useState({});

  const inputRefs = useRef({});
  const debounceTimers = useRef({});

  useEffect(() => {
    axios
      .get("/api/gradebook?classId=1&subjectId=1&termId=1")
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load gradebook"));
  }, []);

  const getKey = (sId, aId) => `${sId}-${aId}`;

  const getScoreColor = (score, max) => {
    if (score == null || !max) return "white";
    const percent = (score / max) * 100;
    if (percent >= 75) return "#d4edda";
    if (percent >= 50) return "#fff3cd";
    return "#f8d7da";
  };

  const getTrend = (studentId, assessmentId, current) => {
    const prev = previousScores[getKey(studentId, assessmentId)];
    if (prev == null || current == null) return "";
    if (current > prev) return "▲";
    if (current < prev) return "▼";
    return "";
  };

  const recalcStudent = (student, assessments, updatedScores) => {
    const validScores = assessments
      .map((a) => {
        const score = updatedScores[a.id];
        if (score == null || !a.maxScore) return null;
        return score / a.maxScore;
      })
      .filter((v) => v != null);

    const avg =
      validScores.length > 0
        ? validScores.reduce((a, b) => a + b, 0) /
          validScores.length
        : null;

    const missingCount =
      assessments.length - validScores.length;

    return {
      ...student,
      scores: updatedScores,
      average: avg,
      missingCount,
    };
  };

  const saveScore = async (studentId, assessmentId, score) => {
    const key = getKey(studentId, assessmentId);
    setSaving((prev) => ({ ...prev, [key]: true }));

    try {
      await axios.post("/api/gradebook/score", {
        studentId,
        assessmentId,
        score,
      });

      setPreviousScores((prev) => ({
        ...prev,
        [key]: score,
      }));
    } catch (err) {
      console.error("Save failed (offline?)", err);
    } finally {
      setSaving((prev) => ({ ...prev, [key]: false }));
    }
  };

  const handleScoreChange = (studentId, assessmentId, value) => {
    const newScore =
      value === "" || value === null ? null : Number(value);

    setData((prev) => {
      if (!prev) return prev;

      const assessment = prev.assessments.find(
        (a) => a.id === assessmentId
      );
      const max = assessment?.maxScore || 100;

      const safeScore =
        newScore == null ? null : Math.min(newScore, max);

      const updatedStudents = prev.students.map((student) => {
        if (student.id !== studentId) return student;

        const updatedScores = {
          ...student.scores,
          [assessmentId]: safeScore,
        };

        return recalcStudent(student, prev.assessments, updatedScores);
      });

      return { ...prev, students: updatedStudents };
    });

    // 🔥 Debounce save
    const key = getKey(studentId, assessmentId);

    if (debounceTimers.current[key]) {
      clearTimeout(debounceTimers.current[key]);
    }

    debounceTimers.current[key] = setTimeout(() => {
      saveScore(studentId, assessmentId, newScore);
    }, 500);
  };

  const handleUndo = (studentId, assessmentId) => {
    const key = getKey(studentId, assessmentId);
    const prevValue = previousScores[key];

    if (prevValue === undefined) return;

    handleScoreChange(studentId, assessmentId, prevValue);
  };

  const handleKeyDown = (e, rowIndex, colIndex, studentId, aId) => {
    if (e.ctrlKey && e.key === "z") {
      e.preventDefault();
      handleUndo(studentId, aId);
      return;
    }

    const moves = {
      ArrowRight: [rowIndex, colIndex + 1],
      ArrowLeft: [rowIndex, colIndex - 1],
      ArrowDown: [rowIndex + 1, colIndex],
      ArrowUp: [rowIndex - 1, colIndex],
      Enter: [rowIndex, colIndex + 1],
    };

    if (!moves[e.key]) return;

    e.preventDefault();
    const [r, c] = moves[e.key];
    const next = inputRefs.current[`${r}-${c}`];
    if (next) next.focus();
  };

  if (error) return <div>{error}</div>;
  if (!data) return <div>Loading...</div>;

  const students = data.students || [];
  const assessments = data.assessments || [];

  const filteredAssessments =
    filter === "ALL"
      ? assessments
      : assessments.filter((a) => a.type === filter);

  const classAvg =
    students.length > 0
      ? students.reduce((sum, s) => sum + (s.average || 0), 0) /
        students.length
      : null;

  return (
    <div className="p-4 overflow-x-auto">
      <h2>Gradebook</h2>

      <div style={{ marginBottom: 10 }}>
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="ALL">All</option>
          <option value="HOMEWORK">Homework</option>
          <option value="TEST">Test</option>
          <option value="QUIZ">Quiz</option>
        </select>
      </div>

      <table className="border w-full">
        <thead>
          <tr>
            <th style={{ position: "sticky", left: 0, background: "#fff" }}>
              Student
            </th>

            {filteredAssessments.map((a) => (
              <th key={a.id}>{a.title}</th>
            ))}

            <th>Avg</th>
            <th>Missing</th>
          </tr>
        </thead>

        <tbody>
          {students.map((student, rowIndex) => (
            <tr key={student.id}>
              <td style={{ position: "sticky", left: 0, background: "#fff" }}>
                {student.name}
              </td>

              {filteredAssessments.map((a, colIndex) => {
                const key = getKey(student.id, a.id);
                const score = student.scores?.[a.id] ?? "";

                return (
                  <td key={a.id}>
                    <div style={{ position: "relative" }}>
                      <input
                        ref={(el) =>
                          (inputRefs.current[`${rowIndex}-${colIndex}`] = el)
                        }
                        value={score}
                        type="number"
                        min={0}
                        max={a.maxScore}
                        onKeyDown={(e) =>
                          handleKeyDown(
                            e,
                            rowIndex,
                            colIndex,
                            student.id,
                            a.id
                          )
                        }
                        onChange={(e) =>
                          handleScoreChange(
                            student.id,
                            a.id,
                            e.target.value
                          )
                        }
                        style={{
                          width: 60,
                          backgroundColor: getScoreColor(score, a.maxScore),
                        }}
                      />

                      {saving[key] && (
                        <span style={{ fontSize: 10 }}>...</span>
                      )}

                      <span style={{ marginLeft: 4 }}>
                        {getTrend(student.id, a.id, score)}
                      </span>
                    </div>
                  </td>
                );
              })}

              <td>
                {student.average != null
                  ? (student.average * 100).toFixed(0) + "%"
                  : "-"}
              </td>

              <td>{student.missingCount ?? "-"}</td>
            </tr>
          ))}

          <tr>
            <td style={{ fontWeight: "bold" }}>Class Avg</td>
            <td colSpan={filteredAssessments.length}></td>
            <td>
              {classAvg != null
                ? (classAvg * 100).toFixed(0) + "%"
                : "-"}
            </td>
            <td></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}