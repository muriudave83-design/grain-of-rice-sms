import { useEffect, useState } from "react";
import apiClient from "../../services/apiClient";

function EditableRow({ student, assessments, onSaved }) {
  const [scores, setScores] = useState({ ...student.scores });
  const [saving, setSaving] = useState(false);

  const handleChange = (assessmentId, value) => {
    setScores({
      ...scores,
      [assessmentId]: value,
    });
  };

  const saveRow = async () => {
    setSaving(true);
    try {
      for (const assessment of assessments) {
        const value = scores[assessment.id];

        if (value === "" || value === undefined) continue;

        await apiClient.post("/gradebook/score", {
          assessmentId: assessment.id,
          studentId: student.id,
          score: Number(value),
        });
      }

      onSaved();
    } catch (err) {
      alert("Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  const numericScores = Object.values(scores)
    .filter((v) => v !== "" && v !== undefined)
    .map((v) => Number(v));

  const average =
    numericScores.length > 0
      ? (
          numericScores.reduce((a, b) => a + b, 0) /
          numericScores.length
        ).toFixed(1)
      : "—";

  return (
    <tr className="border-t">
      <td className="p-3">{student.name}</td>

      {assessments.map((a) => (
        <td key={a.id} className="p-3">
          <input
            type="number"
            min={0}
            max={a.maxScore}
            disabled={a.status === "SUBMITTED"}
            value={scores[a.id] ?? ""}
            className={`
              w-16 p-1 text-center border
              ${a.status === "SUBMITTED" ? "bg-gray-100 cursor-not-allowed" : ""}
              ${scores[a.id] == null ? "bg-gray-50 border-dashed" : "bg-white"}
            `}
            onChange={(e) => {
              const value = e.target.value;

              if (value === "") {
                handleChange(a.id, "");
                return;
              }

              if (Number(value) > a.maxScore) {
                alert(`Max score is ${a.maxScore}`);
                return;
              }

              handleChange(a.id, value);
            }}
          />
        </td>
      ))}

      <td
        className={`p-3 font-semibold text-center ${
          average !== "—" && Number(average) < 40
            ? "text-red-600"
            : ""
        }`}
      >
        {average}
      </td>

      <td className="p-3">
        <button
          onClick={saveRow}
          disabled={saving}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </td>
    </tr>
  );
}

export default function TeacherGradebook() {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [gradebook, setGradebook] = useState(null);

  const fetchClasses = async () => {
    try {
      const res = await apiClient.get("/classes/mine");
      setClasses(res.data);
    } catch (err) {
      console.error("Failed to load classes", err);
    }
  };

  const fetchSubjects = async (cid) => {
    if (!cid) return;
    try {
      const res = await apiClient.get(`/classes/${cid}/subjects`);
      setSubjects(res.data);
    } catch (err) {
      console.error("Failed to load subjects", err);
    }
  };

  const fetchGradebook = async () => {
    if (!classId || !subjectId) return;

    try {
      const res = await apiClient.get(
        `/gradebook?classId=${classId}&subjectId=${subjectId}`
      );
      setGradebook(res.data);
    } catch (err) {
      console.error("Failed to load gradebook", err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchSubjects(classId);
  }, [classId]);

  useEffect(() => {
    fetchGradebook();
  }, [classId, subjectId]);

  // ✅ Compute class average per assessment
  const computeClassAverageForAssessment = (assessmentId) => {
    if (!gradebook) return null;

    const values = gradebook.students
      .map((s) => s.scores[assessmentId])
      .filter((v) => typeof v === "number");

    if (values.length === 0) return null;

    return (
      values.reduce((a, b) => a + b, 0) / values.length
    ).toFixed(1);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-6">Gradebook</h1>

      <div className="flex gap-4 mb-6">
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className="border p-2"
        >
          <option value="">Select class</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className="border p-2"
        >
          <option value="">Select subject</option>
          {subjects.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {!gradebook && (
        <div className="text-gray-500">
          Select class and subject to view gradebook.
        </div>
      )}

      {gradebook && (
        <div className="overflow-auto bg-white shadow rounded">
          <table className="w-full text-left">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3">Student</th>
                {gradebook.assessments.map((a) => (
                  <th key={a.id} className="p-3">
                    {a.title}
                  </th>
                ))}
                <th className="p-3 text-center">Average</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>

            <tbody>
              {gradebook.students.map((s) => (
                <EditableRow
                  key={s.id}
                  student={s}
                  assessments={gradebook.assessments}
                  onSaved={fetchGradebook}
                />
              ))}
            </tbody>

            {/* ✅ Class Average Footer Row */}
            <tfoot>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-3">Class Avg</td>

                {gradebook.assessments.map((a) => (
                  <td key={a.id} className="text-center">
                    {computeClassAverageForAssessment(a.id) ?? "—"}
                  </td>
                ))}

                <td className="text-center">
                  {(() => {
                    const values = gradebook.students
                      .map((s) => {
                        const scores = Object.values(s.scores)
                          .filter(
                            (v) => v !== "" && v !== undefined
                          )
                          .map((v) => Number(v));

                        if (scores.length === 0) return null;

                        return (
                          scores.reduce((a, b) => a + b, 0) /
                          scores.length
                        );
                      })
                      .filter((v) => typeof v === "number");

                    if (values.length === 0) return "—";

                    return (
                      values.reduce((a, b) => a + b, 0) /
                      values.length
                    ).toFixed(1);
                  })()}
                </td>

                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}