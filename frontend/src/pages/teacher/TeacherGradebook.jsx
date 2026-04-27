import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import apiClient from "../../services/apiClient";

/*
--------------------------------------------------
Tiny Save Hook (same as ScoresEntry)
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
          assignmentId: assessment.id,
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
            max={a.maxPoints}
            disabled={a.isLocked}
            value={scores[a.id] ?? ""}
            className={`
              w-16 p-1 text-center border
              ${a.isLocked ? "bg-gray-100 cursor-not-allowed" : ""}
              ${scores[a.id] == null ? "bg-gray-50 border-dashed" : "bg-white"}
            `}
            onChange={(e) => {
              const value = e.target.value;

              if (value === "") {
                handleChange(a.id, "");
                return;
              }

              if (Number(value) > a.maxPoints) {
                alert(`Max points is ${a.maxPoints}`);
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
  console.log("🔥 THIS IS THE REAL GRADEBOOK FILE");

  const navigate = useNavigate();
  const { id } = useParams();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);

  const [classId, setClassId] = useState(id || "");
  const [subjectId, setSubjectId] = useState("");

  const [gradebook, setGradebook] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);

  // 🔥 NEW MODAL STATE
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "ASSIGNMENT",
    maxPoints: 100,
    dateAssigned: "",
    dueDate: "",
  });

  const handleRightClick = (e, assignment) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
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

  // -----------------------------
  // FETCH FUNCTIONS
  // -----------------------------
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
      setSubjects(res.data || []);
    } catch (err) {
      console.error("Failed to load subjects", err);
      setSubjects([]);
    }
  };

  const fetchGradebook = async () => {
    if (!classId || !subjectId) return;

    try {
      const url = `/gradebook/${subjectId}?termId=1`;
      const res = await apiClient.get(url);
      setGradebook(res.data);
    } catch (err) {
      console.error("Failed to load gradebook", err);
    }
  };

  // 🔥 NEW CREATE HANDLER
const handleCreateAssignment = async () => {
  if (!form.title || !subjectId) return;

  try {
    await apiClient.post("/teacher/assignment", {
      title: form.title,
      type: form.type,
      subjectId: subjectId,
      maxPoints: Number(form.maxPoints),
      dateAssigned: form.dateAssigned || null,
      dueDate: form.dueDate || null,
    });

    setShowModal(false);

    setForm({
      title: "",
      type: "ASSIGNMENT",
      maxPoints: 100,
      dateAssigned: "",
      dueDate: "",
    });

    fetchGradebook();
  } catch (err) {
    console.error("Failed to create assignment", err);
  }
};
    // -----------------------------
  // EFFECTS
  // -----------------------------
  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (id) {
      setClassId(id);
      fetchSubjects(id);
    }
  }, [id]);

  useEffect(() => {
    if (classId) {
      fetchSubjects(classId);
    }
  }, [classId]);

  useEffect(() => {
    if (subjects.length > 0) {
      setSubjectId((prev) => prev || subjects[0].id);
    }
  }, [subjects]);

  useEffect(() => {
    if (classId && subjectId) {
      fetchGradebook();
    }
  }, [classId, subjectId]);

  const computeClassAverageForAssessment = (assignmentId) => {
    if (!gradebook) return null;

    const values = gradebook.students
      .map((s) => s.scores[assignmentId])
      .filter((v) => typeof v === "number");

    if (values.length === 0) return null;

    return (
      values.reduce((a, b) => a + b, 0) / values.length
    ).toFixed(1);
  };

  const computeClassOverallAverage = () => {
    if (!gradebook) return "—";

    const values = gradebook.students
      .map((s) => s.average)
      .filter((v) => typeof v === "number");

    if (values.length === 0) return "—";

    return (
      values.reduce((a, b) => a + b, 0) / values.length
    ).toFixed(2);
  };

  return (
    <div
      className="p-6"
      onClick={() => setContextMenu(null)}
      onContextMenu={(e) => e.stopPropagation()}
    >
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

      {/* Selectors */}
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

      {/* 🔥 ADD BUTTON (REPLACES OLD INPUT) */}
      {gradebook && (
        <div className="mb-4">
          <button
            onClick={() => setShowModal(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded"
            >
              + Add Assignment
          </button>
        </div>
      )}

      {!gradebook && (
        <div className="text-gray-500">
          Select class and subject to view gradebook.
        </div>
      )}
            {/* Table */}
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

      {/* 🔥 MODAL UI */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white p-6 rounded shadow w-96"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">
              New Assignment
            </h3>

            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="border p-2 w-full mb-3"
            />

            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
              className="border p-2 w-full mb-3"
            >
              <option value="ASSIGNMENT">Assignment</option>
              <option value="TEST">Test</option>
              <option value="PROJECT">Project</option>
            </select>

            <input
              type="number"
              placeholder="Max Points"
              value={form.maxPoints}
              onChange={(e) =>
                setForm({ ...form, maxPoints: e.target.value })
              }
              className="border p-2 w-full mb-3"
            />

            <label className="text-sm">Date Assigned</label>
            <input
              type="date"
              value={form.dateAssigned}
              onChange={(e) =>
                setForm({ ...form, dateAssigned: e.target.value })
              }
              className="border p-2 w-full mb-3"
            />

            <label className="text-sm">Due Date</label>
            <input
              type="date"
              value={form.dueDate}
              onChange={(e) =>
                setForm({ ...form, dueDate: e.target.value })
              }
              className="border p-2 w-full mb-4"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="border px-4 py-2 rounded"
              >
                Cancel
              </button>

              <button
                onClick={handleCreateAssignment}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            background: "red",
            color: "white",
            padding: "8px",
            borderRadius: "6px",
            zIndex: 999999,
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