import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";

/*
--------------------------------------------------
Tiny Save Hook (same as ScoresEntry)
Safe: local to this file
--------------------------------------------------
*/
function useSaveStatus() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function startSaving() {
    setSaving(true);
    setSaved(false);
  }

  function finishSaving() {
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return { saving, saved, startSaving, finishSaving };
}

function EditableRow({ student, assessments, onSaved }) {
  const [scores, setScores] = useState({ ...student.scores });
  const { saving, saved, startSaving, finishSaving } = useSaveStatus();

  const handleChange = (assessmentId, value) => {
    setScores({
      ...scores,
      [assessmentId]: value,
    });
  };

  const saveRow = async () => {
    startSaving();

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

      finishSaving();
      onSaved();
    } catch (err) {
      alert("Failed to save scores");
    }
  };

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
          student.average != null && Number(student.average) < 40
            ? "text-red-600"
            : ""
        }`}
      >
        {student.average != null
          ? Number(student.average).toFixed(2)
          : "—"}
      </td>

      <td className="p-3">
        <button
          onClick={saveRow}
          disabled={saving}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          {saving ? "Saving..." : saved ? "Saved ✓" : "Save"}
        </button>
      </td>
    </tr>
  );
}

export default function TeacherGradebook() {
    throw new Error("TESTING FILE ACTIVE"); // 👈 ADD THIS LINE

  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");

  const [gradebook, setGradebook] = useState(null);

  const [newAssignment, setNewAssignment] = useState("");

  // ✅ RIGHT CLICK CONTEXT MENU STATE
  const [contextMenu, setContextMenu] = useState(null);

  const handleRightClick = (e, assignment) => {
    e.preventDefault();

    console.log("RIGHT CLICK WORKING", assignment); // 🧪 debug

    setContextMenu({
      x: e.clientX, // ✅ FIXED
      y: e.clientY, // ✅ FIXED
      assignment,
    });
  };

  const handleDeleteAssignment = async () => {
    try {
      await apiClient.delete(
        `/teacher/assignment/${contextMenu.assignment.id}`
      );

      setContextMenu(null);
      fetchGradebook();
    } catch (err) {
      console.error("Failed to delete assignment", err);
    }
  };

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

  const handleAddAssignment = async () => {
    if (!newAssignment.trim()) return;

    try {
      await apiClient.post(`/teacher/assignment`, {
        title: newAssignment,
        subjectId: subjectId,
        maxScore: 100,
        type: "ASSIGNMENT",
      });

      setNewAssignment("");
      fetchGradebook();
    } catch (err) {
      console.error("Failed to create assignment", err);
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

  const computeClassAverageForAssessment = (assessmentId) => {
    if (!gradebook) return null;

    const values = gradebook.students
      .map((s) => s.scores[assessmentId])
      .filter((v) => typeof v === "number");

    if (values.length === 0) return null;

    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
  };

  const computeClassOverallAverage = () => {
    if (!gradebook) return "—";

    const values = gradebook.students
      .map((s) => s.average)
      .filter((v) => typeof v === "number");

    if (values.length === 0) return "—";

    return (values.reduce((a, b) => a + b, 0) / values.length).toFixed(2);
  };

  return (
    <div
      className="p-6"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => {
        e.stopPropagation(); // ✅ FIXED
      }}
    >
      {/* Breadcrumb */}
      <div className="text-sm text-gray-600 mb-2">
        Teacher / Gradebook
      </div>

      <button
        onClick={() => navigate("/teacher")}
        className="mb-4 px-3 py-1 border rounded"
      >
        ← Back to Dashboard
      </button>

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

      {/* Add Assignment */}
      {gradebook && (
        <div className="mb-4 flex gap-2">
          <input
            placeholder="New assignment"
            value={newAssignment}
            onChange={(e) => setNewAssignment(e.target.value)}
            className="border p-2"
          />
          <button
            onClick={handleAddAssignment}
            className="bg-green-600 text-white px-4 rounded"
          >
            Add
          </button>
        </div>
      )}

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
                    <div
                      onContextMenu={(e) => handleRightClick(e, a)}
                      style={{ cursor: "context-menu", width: "100%" }}
                    >
                      {a.title}
                    </div>
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

            <tfoot>
              <tr className="border-t bg-gray-50 font-semibold">
                <td className="p-3">Class Avg</td>

                {gradebook.assessments.map((a) => (
                  <td key={a.id} className="text-center">
                    {computeClassAverageForAssessment(a.id) ?? "—"}
                  </td>
                ))}

                <td className="text-center">
                  {computeClassOverallAverage()}
                </td>

                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* ✅ CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "red", // ✅ DEBUG
            color: "white",
            padding: "8px",
            borderRadius: "6px",
            zIndex: 999999, // ✅ VERY HIGH
            border: "2px solid black",
          }}
          onMouseLeave={() => setContextMenu(null)}
        >
          <div
            onClick={handleDeleteAssignment}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
            }}
          >
            Delete Column
          </div>
        </div>
      )}
    </div>
  );
}