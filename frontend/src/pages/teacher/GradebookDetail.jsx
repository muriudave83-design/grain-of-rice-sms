import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import apiClient from "../../services/apiClient";

// ✅ NEW IMPORT (Drag & Drop)
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

// ✅ NEW IMPORT (CSV)
import Papa from "papaparse";
import { rankStudents } from "../../utils/ranking";


export default function GradebookDetail() {
  const { id } = useParams();
  const classId = new URLSearchParams(window.location.search).get("classId");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newAssignment, setNewAssignment] = useState("");
  const [newType, setNewType] = useState("HOMEWORK");
  const [localScores, setLocalScores] = useState({});
  const [saving, setSaving] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);
  // 🧱 NEW — TERMS
const [terms, setTerms] = useState([]);
const [selectedTerm, setSelectedTerm] = useState(null);

const fetchData = async (termId) => {
  try {
    const res = await apiClient.get(
      `/teacher/gradebook/${id}?termId=${termId}`
    );
    setData(res.data);
  } catch (err) {
    console.error("Failed to load gradebook:", err);
    setError("Failed to load gradebook");
  } finally {
    setLoading(false);
  }
};

// 🧱 LOAD TERMS
        useEffect(() => {
          async function loadTerms() {
            try {
              const res = await apiClient.get(`/teacher/terms/${classId}`);

              setTerms(res.data);

              if (res.data.length > 0) {
                setSelectedTerm(res.data[0].id);
              }
            } catch (err) {
              console.error("Failed to load terms", err);
            }
          }

          if (classId) {
            loadTerms();
          }
        }, [classId]);


    // 🧱 FETCH GRADEBOOK WHEN TERM CHANGES
    useEffect(() => {
      if (!selectedTerm) return;

      fetchData(selectedTerm);
    }, [id, selectedTerm]);

  const handleRightClick = (e, assignment) => {
    e.preventDefault();
    e.stopPropagation();

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      assignment,
    });
  };

  const students = data?.class?.students || [];
  const assignments = data?.assignments || [];

  // ✅ DRAG HANDLER
  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(assignments);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    setData((prev) => ({
      ...prev,
      assignments: items,
    }));

    try {
      await apiClient.put("/teacher/assignment/reorder", {
        assignments: items.map((a, index) => ({
          id: a.id,
          position: index,
        })),
      });
    } catch (err) {
      console.error("Reorder failed", err);
    }
  };

  // ✅ CATEGORY AVERAGES
  const getCategoryAverages = (student) => {
    const categories = {};

    assignments.forEach((a) => {
      const type = a.type || "HOMEWORK";

      const scoreObj = a.scores?.find(
        (s) => String(s.studentId) === String(student.id)
      );

      if (!scoreObj) return;

      if (!categories[type]) {
        categories[type] = { total: 0, count: 0 };
      }

      categories[type].total += scoreObj.score;
      categories[type].count += 1;
    });

    const result = {};

    Object.keys(categories).forEach((type) => {
      const c = categories[type];
      result[type] = c.total / c.count;
    });

    return result;
  };

  // ✅ CATEGORY WEIGHTS
  const getCategoryWeights = () => {
    const weights = data?.categoryWeights;

    if (!weights || weights.length === 0) {
      const uniqueTypes = [
        ...new Set(assignments.map((a) => a.type || "HOMEWORK")),
      ];
      const equal = 1 / (uniqueTypes.length || 1);

      return uniqueTypes.map((type) => ({ type, weight: equal }));
    }

    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

    if (Math.abs(totalWeight - 1) > 0.01) {
      console.warn("⚠️ Category weights do not sum to 1. Auto-normalizing...");

      return weights.map((w) => ({
        ...w,
        weight: w.weight / totalWeight,
      }));
    }

    return weights;
  };
    // ✅ FINAL GRADE CORE
  const calculateFinalGrade = (categoryAverages, weights) => {
    if (!categoryAverages || !weights) return 0;

    let total = 0;
    let appliedWeight = 0;

    for (const w of weights) {
      const avg = categoryAverages[w.type];

      if (avg !== undefined && !isNaN(avg)) {
        total += avg * w.weight;
        appliedWeight += w.weight;
      }
    }

    if (appliedWeight === 0) return 0;

    return total / appliedWeight;
  };

  const getFinalGrade = (student) => {
    const categoryAverages = getCategoryAverages(student);
    const weights = getCategoryWeights();
    return calculateFinalGrade(categoryAverages, weights);
  };

  const getStudentTotal = (student) => {
    if (!assignments) return 0;

    let total = 0;

    assignments.forEach((a) => {
      const scoreObj = a.scores?.find(
        (s) => String(s.studentId) === String(student.id)
      );

      if (!scoreObj) return;

      const weight = a.weight || 1;
      total += scoreObj.score * weight;
    });

    return total;
  };

  const getStudentAverage = (student) => {
    if (!assignments) return 0;

    let total = 0;
    let totalWeight = 0;

    assignments.forEach((a) => {
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


  // ✅ RANKING (FIXED — PRODUCTION SAFE)

const { ranked: rankedStudents, positionMap } = useMemo(() => {
  return rankStudents(students || [], getFinalGrade);
}, [students, assignments, data?.categoryWeights]);

const getPosition = (studentId) => positionMap[studentId] || "-";

  // 🧱 NEW — LOCK TOGGLE HANDLER
  const handleToggleLock = async (assignment) => {
    try {
      const res = await apiClient.put(
        `/teacher/assignment/${assignment.id}/lock`,
        { isLocked: !assignment.isLocked }
      );

      setData((prev) => {
        const updated = { ...prev };
        const a = updated.assignments.find((x) => x.id === assignment.id);
        if (a) a.isLocked = res.data.isLocked;
        return updated;
      });

      setContextMenu(null);
    } catch (err) {
      console.error("Lock toggle failed", err);
    }
  };

  const handleAddAssignment = async () => {
    if (!newAssignment) return;

    try {
          const res = await apiClient.post("/teacher/assignment", {
            title: newAssignment,
            teacherSubjectId: id,
            type: newType,
            termId: selectedTerm,
          });

          setData((prev) => ({
            ...prev,
            assignments: [...prev.assignments, { ...res.data, scores: [] }],
          }));

      setNewAssignment("");
      setNewType("HOMEWORK");
    } catch (err) {
      console.error("Failed to create assignment", err);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      await apiClient.delete(`/teacher/assignment/${assignmentId}`);

      setData((prev) => ({
        ...prev,
        assignments: prev.assignments.filter(
          (a) => a.id !== assignmentId
        ),
      }));

      setContextMenu(null);
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const handleRenameAssignment = async (assignmentId, title) => {
    if (!title) return;

    try {
      await apiClient.put(`/teacher/assignment/${assignmentId}`, {
        title,
      });

      setData((prev) => {
        const updated = { ...prev };
        const assignment = updated.assignments.find(
          (a) => a.id === assignmentId
        );
        if (assignment) assignment.title = title;
        return updated;
      });
    } catch (err) {
      console.error("Rename failed", err);
    }
  };
    const handleWeightChange = async (id, weight) => {
    const weightNumber = Number(weight);
    if (isNaN(weightNumber)) return;

    try {
      await apiClient.put(`/teacher/assignment/${id}`, {
        weight: weightNumber,
      });

      setData((prev) => {
        const updated = { ...prev };
        const assignment = updated.assignments.find(
          (a) => a.id === id
        );
        if (assignment) assignment.weight = weightNumber;
        return updated;
      });
    } catch (err) {
      console.error("Weight update failed", err);
    }
  };

  // 🧱 CSV EXPORT
  const handleExportCSV = () => {
    if (!data) return;

    const headers = [
      "Student Name",
      ...assignments.map((a) => a.title),
      "Final",
    ];

    const rows = students.map((student) => {
      const scores = assignments.map((a) => {
        const scoreObj = a.scores?.find(
          (s) => String(s.studentId) === String(student.id)
        );
        return scoreObj ? scoreObj.score : "";
      });

      const final = getStudentAverage(student);

      return [
        `${student.firstName} ${student.lastName}`,
        ...scores,
        final ? final.toFixed(1) : "",
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "gradebook.csv";
    link.click();
  };

  // 🧱 CSV IMPORT (BULK GRADING 🚀)
  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      skipEmptyLines: true,
      complete: async (results) => {
        const [header, ...rows] = results.data;

        const assignmentMap = {};
        assignments.forEach((a) => {
          assignmentMap[a.title.trim()] = {
            id: a.id,
            isLocked: a.isLocked,
          };
        });

        const updates = [];

        rows.forEach((row) => {
          if (!row || row.length === 0) return;

          const studentName = row[0]?.trim();

          const student = students.find(
            (s) => `${s.firstName} ${s.lastName}`.trim() === studentName
          );

          if (!student) return;

          row.slice(1).forEach((value, index) => {
            const assignmentTitle = header[index + 1]?.trim();
            const assignment = assignmentMap[assignmentTitle];

            if (!assignment) return;
            if (assignment.isLocked) return;
            if (value === "" || value === null || value === undefined) return;

            const score = Number(value);

            if (isNaN(score) || score < 0 || score > 100) return;

            updates.push({
              studentId: student.id,
              assignmentId: assignment.id,
              score,
            });
          });
        });

        try {
          await apiClient.post("/teacher/score/bulk", { updates });
          alert(`Imported ${updates.length} scores ✅`);
          fetchData(selectedTerm);
        } catch (err) {
          console.error("Import failed", err);
          alert("Import failed ❌");
        }
      },
    });
  };

  // 🧾 GENERATE TRANSCRIPTS (✅ FIXED LOCATION)
  const handleGenerateTranscript = async () => {
    if (!data?.class?.id) {
      alert("Class not loaded");
      return;
    }

    try {
      await apiClient.post("/teacher/transcript/generate", {
        classId: data.class.id,
        termId: selectedTerm,
      });

      alert("Transcripts generated ✅");
    } catch (err) {
      console.error("Transcript error", err);
      alert("Failed to generate transcripts ❌");
    }
  };

  const handleScoreChange = async (
    studentId,
    assignmentId,
    value,
    isLocked
  ) => {
    if (isLocked) return;

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

        if (!assignment) return prev;

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

  return (
    <div className="p-6" onClick={() => setContextMenu(null)}>
      <h1 className="text-2xl font-bold mb-4">
        {data.class?.name} - {data.subject?.name}
      </h1>

      {/* 🧱 TERM SELECTOR */}
      <div className="mb-4">
        <select
          value={selectedTerm ?? ""}
          onChange={(e) => setSelectedTerm(Number(e.target.value))}
          className="border p-2"
        >
          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {saving && <p className="text-sm text-gray-500 mb-2">Saving...</p>}

      {/* 🧱 CSV CONTROLS */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleExportCSV}
          className="bg-green-600 text-white px-4 py-2"
        >
          Export CSV
        </button>

        <input
          type="file"
          accept=".csv"
          onChange={handleImportCSV}
          className="border p-2"
        />

        <button
          onClick={handleGenerateTranscript}
          className="bg-purple-600 text-white px-4 py-2"
        >
          Generate Transcripts
        </button>
      </div>

      {/* EXISTING CONTROLS */}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="New assignment"
          value={newAssignment}
          onChange={(e) => setNewAssignment(e.target.value)}
          className="border p-2"
        />

        <select
          value={newType}
          onChange={(e) => setNewType(e.target.value)}
          className="border p-2"
        >
          <option value="HOMEWORK">Homework</option>
          <option value="QUIZ">Quiz</option>
          <option value="TEST">Test</option>
          <option value="PROJECT">Project</option>
          <option value="EXAM">Exam</option>
        </select>

        <button
          onClick={handleAddAssignment}
          className="bg-blue-500 text-white px-4"
        >
          Add
        </button>
      </div>

      {/* TABLE */}
      <div>
        <table className="min-w-full border border-gray-300">
          <thead>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable
                droppableId="assignments"
                direction="horizontal"
              >
                {(provided) => (
                  <tr
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-gray-100"
                  >
                    <th className="border px-4 py-2 text-left">
                      Student
                    </th>

                    {assignments.map((a, index) => (
                      <Draggable
                        key={a.id}
                        draggableId={String(a.id)}
                        index={index}
                      >
                        {(provided) => (
                          <th
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`border p-2 relative ${
                              a.isLocked ? "bg-gray-200" : ""
                            }`}
                            onContextMenu={(e) =>
                              handleRightClick(e, a)
                            }
                          >
                            <div className="flex flex-col items-center gap-1">

                              {/* TOP BAR */}
                              <div className="flex justify-between items-center w-full">
                                <span
                                  {...provided.dragHandleProps}
                                  className="cursor-grab text-gray-400 text-sm px-1"
                                >
                                  ≡
                                </span>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRightClick(e, a);
                                  }}
                                  className="text-gray-400 px-1"
                                >
                                  ⋮
                                </button>
                              </div>

                              {/* TITLE */}
                              <input
                                id={`title-${a.id}`}
                                defaultValue={a.title}
                                onBlur={(e) =>
                                  handleRenameAssignment(
                                    a.id,
                                    e.target.value
                                  )
                                }
                                className="border p-1 w-24 text-sm text-center"
                              />

                              {/* TYPE */}
                              <span className="text-xs text-gray-500">
                                {a.type || "HOMEWORK"}
                              </span>

                              {/* 🔒 LOCK */}
                              <span className="text-xs">
                                {a.isLocked ? "🔒" : ""}
                              </span>

                              {/* WEIGHT */}
                              <input
                                type="number"
                                value={a.weight || 1}
                                onChange={(e) =>
                                  handleWeightChange(
                                    a.id,
                                    e.target.value
                                  )
                                }
                                className="w-16 border text-center text-sm"
                              />
                            </div>
                          </th>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}

                    <th className="border p-2">Total</th>
                    <th className="border p-2">Avg</th>
                    <th className="border p-2">Final</th>
                    <th className="border p-2">Grade</th>
                    <th className="border p-2">Position</th>
                  </tr>
                )}
              </Droppable>
            </DragDropContext>
          </thead>
                    <tbody>
            {rankedStudents.map((student) => {
              const total = getStudentTotal(student);
              const avg = getStudentAverage(student);
              const final = getFinalGrade(student);
              const grade = getGrade(final);
              const position = getPosition(student.id);

              return (
                <tr key={student.id}>
                  <td className="border px-4 py-2">
                    {student.firstName} {student.lastName}
                  </td>

                  {assignments.map((a) => {
                    const key = `${student.id}-${a.id}`;
                    const scoreObj = a.scores?.find(
                      (s) =>
                        String(s.studentId) === String(student.id)
                    );

                    return (
                      <td
                        key={a.id}
                        className={`border px-4 py-2 ${
                          a.isLocked ? "bg-gray-50" : ""
                        }`}
                      >
                        <input
                          type="number"
                          disabled={a.isLocked}
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
                              e.target.value,
                              a.isLocked
                            )
                          }
                          className={`w-20 border p-1 ${
                            a.isLocked
                              ? "bg-gray-100 cursor-not-allowed"
                              : ""
                          }`}
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
                  <td className="border p-2 font-bold">
                    {final.toFixed(1)}
                  </td>

                  <td
                    className={`border p-2 font-bold ${getGradeColor(
                      grade
                    )}`}
                  >
                    {grade}
                  </td>

                  <td className="border p-2">{position}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
        >
          <div className="bg-white shadow-lg rounded-md border w-40 py-1">
            {/* RENAME */}
            <div
              onClick={() => {
                const input = document.getElementById(
                  `title-${contextMenu.assignment.id}`
                );
                input?.focus();
                setContextMenu(null);
              }}
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              ✏️ Rename
            </div>

            {/* LOCK / UNLOCK */}
            <div
              onClick={() =>
                handleToggleLock(contextMenu.assignment)
              }
              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
            >
              {contextMenu.assignment.isLocked
                ? "🔓 Unlock"
                : "🔒 Lock"}
            </div>

            {/* DELETE */}
            <div
              onClick={() =>
                handleDeleteAssignment(
                  contextMenu.assignment.id
                )
              }
              className="px-3 py-2 hover:bg-red-100 text-red-600 cursor-pointer text-sm"
            >
              🗑️ Delete
            </div>
          </div>
        </div>
      )}
    </div>
  );
}