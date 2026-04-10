import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../services/apiClient";

export default function GradebookDetail() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newAssignment, setNewAssignment] = useState("");
  const [localScores, setLocalScores] = useState({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const res = await apiClient.get(`/teacher/gradebook/${id}`);
      setData(res.data);
    } catch (err) {
      console.error("Failed to load gradebook:", err);
      setError("Failed to load gradebook");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  // ✅ TOTAL
  const getStudentTotal = (student) => {
    if (!data?.assignments) return 0;

    let total = 0;

    data.assignments.forEach((a) => {
      const scoreObj = a.scores?.find(
        (s) => String(s.studentId) === String(student.id)
      );

      if (!scoreObj) return;

      const weight = a.weight || 1;
      total += scoreObj.score * weight;
    });

    return total;
  };

  // ✅ AVERAGE
  const getStudentAverage = (student) => {
    if (!data?.assignments) return 0;

    let total = 0;
    let totalWeight = 0;

    data.assignments.forEach((a) => {
      const scoreObj = a.scores?.find(
        (s) => String(s.studentId) === String(student.id)
      );

      if (!scoreObj) return;

      const weight = a.weight || 1;

      total += scoreObj.score * weight;
      totalWeight += weight;
    });

    return totalWeight > 0 ? total / totalWeight : 0;
  };

  // ✅ GRADE
  const getGrade = (avg) => {
    if (avg >= 80) return "A";
    if (avg >= 70) return "B";
    if (avg >= 60) return "C";
    if (avg >= 50) return "D";
    return "F";
  };

  const getGradeColor = (grade) => {
    if (grade === "A") return "text-green-600";
    if (grade === "B") return "text-blue-600";
    if (grade === "C") return "text-yellow-600";
    if (grade === "D") return "text-orange-600";
    return "text-red-600";
  };

  // ✅ RANKING (FIXED SOURCE + TIE HANDLING)
  const rankedStudents = useMemo(() => {
    const students = data?.class?.students || [];

    if (students.length === 0) return [];

    const ranked = [...students]
      .map((student) => ({
        ...student,
        average: getStudentAverage(student),
      }))
      .sort((a, b) => b.average - a.average);

    console.log("RANKED:", ranked);

    return ranked;
  }, [data?.class?.students, data?.assignments]);

  // ✅ POSITION MAP WITH TIES (competition ranking)
  const positionMap = useMemo(() => {
    const map = {};
    let currentRank = 1;

    for (let i = 0; i < rankedStudents.length; i++) {
      if (i > 0 && rankedStudents[i].average < rankedStudents[i - 1].average) {
        currentRank = i + 1;
      }

      map[rankedStudents[i].id] = currentRank;
    }

    console.log("POSITION MAP:", map);

    return map;
  }, [rankedStudents]);

  const getPosition = (studentId) => {
    return positionMap[studentId] || "-";
  };

  // ADD ASSIGNMENT
  const handleAddAssignment = async () => {
    if (!newAssignment) return;

    try {
      const res = await apiClient.post("/teacher/assignment", {
        title: newAssignment,
        teacherSubjectId: id,
      });

      setData((prev) => ({
        ...prev,
        assignments: [...prev.assignments, { ...res.data, scores: [] }],
      }));

      setNewAssignment("");
    } catch (err) {
      console.error("Failed to create assignment", err);
    }
  };

  // DELETE
  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await apiClient.delete(`/teacher/assignment/${assignmentId}`);

      setData((prev) => ({
        ...prev,
        assignments: prev.assignments.filter(
          (a) => a.id !== assignmentId
        ),
      }));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  // RENAME
  const handleRenameAssignment = async (assignmentId, title) => {
    if (!title) return;

    try {
      await apiClient.put(`/teacher/assignment/${assignmentId}`, { title });

      setData((prev) => {
        const updated = { ...prev };
        const assignment = updated.assignments.find(
          (a) => a.id === assignmentId
        );
        assignment.title = title;
        return updated;
      });
    } catch (err) {
      console.error("Rename failed", err);
    }
  };

  // WEIGHT
  const handleWeightChange = async (id, weight) => {
    const weightNumber = Number(weight);
    if (isNaN(weightNumber)) return;

    try {
      await apiClient.put(`/teacher/assignment/${id}`, {
        weight: weightNumber,
      });

      setData((prev) => {
        const updated = { ...prev };
        const assignment = updated.assignments.find(a => a.id === id);
        assignment.weight = weightNumber;
        return updated;
      });
    } catch (err) {
      console.error("Weight update failed", err);
    }
  };

  // SCORE
  const handleScoreChange = async (studentId, assignmentId, value) => {
    if (value === "") return;

    const score = Number(value);
    if (isNaN(score) || score < 0 || score > 100) return;

    try {
      setSaving(true);

      await apiClient.post("/teacher/score", {
        studentId,
        assignmentId,
        score,
      });

      setData((prev) => {
        const updated = { ...prev };

        const assignment = updated.assignments.find(
          (a) => a.id === assignmentId
        );

        const existing = assignment.scores.find(
          (s) => String(s.studentId) === String(studentId)
        );

        if (existing) {
          existing.score = score;
        } else {
          assignment.scores.push({ studentId, score });
        }

        return updated;
      });

      setLocalScores((prev) => {
        const copy = { ...prev };
        delete copy[`${studentId}-${assignmentId}`];
        return copy;
      });

      setSaving(false);
    } catch (err) {
      console.error("Failed to save score", err);
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-500">{error}</div>;
  if (!data) return <div className="p-6">No data found</div>;

  const students = data.class?.students || [];
  const assignments = data.assignments || [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        {data.class?.name} - {data.subject?.name}
      </h1>

      {saving && (
        <p className="text-sm text-gray-500 mb-2">Saving...</p>
      )}

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New assignment"
          value={newAssignment}
          onChange={(e) => setNewAssignment(e.target.value)}
          className="border p-2"
        />

        <button
          onClick={handleAddAssignment}
          className="bg-blue-500 text-white px-4"
        >
          Add
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">Student</th>

              {assignments.map((a) => (
                <th key={a.id} className="border p-2">
                  <div className="flex flex-col items-center gap-1">
                    <input
                      defaultValue={a.title}
                      onBlur={(e) =>
                        handleRenameAssignment(a.id, e.target.value)
                      }
                      className="border p-1 w-24"
                    />

                    <input
                      type="number"
                      value={a.weight || 1}
                      onChange={(e) =>
                        handleWeightChange(a.id, e.target.value)
                      }
                      className="w-16 border text-center"
                    />
                  </div>
                </th>
              ))}

              <th className="border p-2">Total</th>
              <th className="border p-2">Avg</th>
              <th className="border p-2">Grade</th>
              <th className="border p-2">Position</th>
            </tr>
          </thead>

          <tbody>
            {students.map((student) => {
              const total = getStudentTotal(student);
              const avg = getStudentAverage(student);
              const grade = getGrade(avg);
              const position = getPosition(student.id);

              return (
                <tr key={student.id}>
                  <td className="border px-4 py-2">
                    {student.firstName} {student.lastName}
                  </td>

                  {assignments.map((a) => {
                    const key = `${student.id}-${a.id}`;

                    const scoreObj = a.scores?.find(
                      (s) => String(s.studentId) === String(student.id)
                    );

                    return (
                      <td key={a.id} className="border px-4 py-2">
                        <input
                          type="number"
                          value={
                            localScores[key] ??
                            (scoreObj ? scoreObj.score : "")
                          }
                          onChange={(e) =>
                            setLocalScores({
                              ...localScores,
                              [key]: e.target.value,
                            })
                          }
                          onBlur={(e) =>
                            handleScoreChange(
                              student.id,
                              a.id,
                              e.target.value
                            )
                          }
                          className="w-20 border p-1"
                        />
                      </td>
                    );
                  })}

                  <td className="border p-2 font-bold">
                    {total.toFixed(1)}
                  </td>

                  <td className="border p-2 font-bold">
                    {avg.toFixed(1)}
                  </td>

                  <td className={`border p-2 font-bold ${getGradeColor(grade)}`}>
                    {grade}
                  </td>

                  <td className="border p-2">
                    {position}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}