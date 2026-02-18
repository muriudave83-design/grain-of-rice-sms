import { useEffect, useState } from "react";

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

        await fetch("http://localhost:5000/api/gradebook/score", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            assessmentId: assessment.id,
            studentId: student.id,
            score: Number(value),
          }),
        });
      }

      onSaved();
    } catch (err) {
      alert("Failed to save scores");
    } finally {
      setSaving(false);
    }
  };

  const average =
    Object.values(scores).length > 0
      ? (
          Object.values(scores).reduce(
            (a, b) => a + Number(b),
            0
          ) / Object.values(scores).length
        ).toFixed(1)
      : "—";

  return (
    <tr className="border-t">
      <td className="p-3">{student.name}</td>

      {assessments.map((a) => (
        <td key={a.id} className="p-3">
          <input
            type="number"
            className="w-16 border p-1"
            value={scores[a.id] ?? ""}
            onChange={(e) =>
              handleChange(a.id, e.target.value)
            }
          />
        </td>
      ))}

      <td className="p-3 font-semibold">{average}</td>

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
    const res = await fetch("http://localhost:5000/api/classes/mine", {
      credentials: "include",
    });
    const data = await res.json();
    setClasses(data);
  };

  const fetchSubjects = async (cid) => {
    if (!cid) return;
    const res = await fetch(
      `http://localhost:5000/api/classes/${cid}/subjects`,
      { credentials: "include" }
    );
    const data = await res.json();
    setSubjects(data);
  };

  const fetchGradebook = async () => {
    if (!classId || !subjectId) return;

    const res = await fetch(
      `http://localhost:5000/api/gradebook?classId=${classId}&subjectId=${subjectId}`,
      { credentials: "include" }
    );

    const data = await res.json();
    setGradebook(data);
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
                <th className="p-3">Average</th>
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
          </table>
        </div>
      )}
    </div>
  );
}
