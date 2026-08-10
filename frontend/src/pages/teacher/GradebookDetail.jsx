import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../../services/apiClient";
import BackButton from "../../components/BackButton";

// ✅ NEW IMPORT (Drag & Drop)
import {
  DragDropContext,
  Droppable,
  Draggable,
} from "@hello-pangea/dnd";

// ✅ NEW IMPORT (CSV)
import Papa from "papaparse";
import { rankStudents } from "../../utils/ranking";
import { formatGrade } from "../../utils/grading";

export default function GradebookDetail() {
  console.log("🔥 REAL GRADEBOOK DETAIL FILE");

  const { id } = useParams();
  const navigate = useNavigate();
  const [classId, setClassId] = useState(null);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [termLocked, setTermLocked] = useState(false);
  const [lockMessage, setLockMessage] = useState("");

  // ❌ OLD (will be removed from UI but kept temporarily safe)
  const [newAssignment, setNewAssignment] = useState("");

  // 🔥 NEW MODAL STATE
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "ASSIGNMENT",
    maxPoints: 100,
    dateAssigned: "",
    dueDate: "",
  });

  const [localScores, setLocalScores] = useState({});
  const [saving, setSaving] = useState(false);

  const [contextMenu, setContextMenu] = useState(null);

  // 🧱 TERMS
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);

  // 🆕 FULL TERM OBJECT
  const [selectedTermData, setSelectedTermData] = useState(null);

  // 🆕 ATTENDANCE STATE
  const [attendanceMap, setAttendanceMap] = useState({});

  // 🆕 FETCH ATTENDANCE
    const fetchAttendance = async (classId, term) => {
      try {
        if (!classId || !term) return;

        const startDate =
          term.startDate || term.start || term.termStartDate;

        const endDate =
          term.endDate || term.end || term.termEndDate;

        if (!startDate || !endDate) {
          console.warn("⚠️ Term dates missing");
          return;
        }

        const res = await apiClient.get(
          `/attendance/report`,
          {
            params: {
              classId,
              startDate,
              endDate,
            },
          }
        );

        // 🔥 Build attendance map
        const map = {};

        const records = res.data.records || res.data || [];

        records.forEach((r) => {
          const key = r.studentId;

          if (!key) return;

          // ✅ ONLY COUNT ABSENCES
          const status =
            r.status ||
            r.attendanceStatus ||
            r.present;

          const isAbsent =
            status === "ABSENT" ||
            status === "Absent" ||
            status === false;

          // Ignore PRESENT/LATE/etc
          if (!isAbsent) return;

          if (!map[key]) {
            map[key] = 0;
          }

          map[key] += 1;
        });

        console.log("📊 Attendance Map:", map);

        setAttendanceMap(map);
      } catch (err) {
        console.error("❌ Failed to fetch attendance", err);
      }
  };
    // 🧱 LOAD TERMS
  useEffect(() => {
    async function loadTerms() {
      try {
        const res = await apiClient.get(`/teacher/terms/${classId}`);

        console.log("📦 TERMS RESPONSE:", res.data);

      // ✅ Always show all 3 terms

      const normalizedTerms = res.data || [];   

      setTerms(normalizedTerms);

      const forcedTerm = normalizedTerms.find(
        (t) => t.name === "Term 2"
      );

      if (forcedTerm) {
      console.log("✅ Forced Term:", forcedTerm);

      setSelectedTerm(forcedTerm.id);

      // ✅ SAVE FULL TERM
      setSelectedTermData(forcedTerm);
      } else {
      console.warn("⚠️ Term 2 not found");

      setSelectedTerm(null);
      }
      } catch (err) {
        console.error("❌ Failed to load terms", err);
        setError("Failed to load terms");
        setLoading(false);
      }
    }

    if (classId) {
      loadTerms();
    }
  }, [classId]);

  // 🧱 FETCH GRADEBOOK (DETERMINISTIC — NO RACE CONDITIONS)
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        console.log("🚀 START INIT");
        if (!id) {
          setError("No gradebook assigned yet");
          setLoading(false);
          return;
        }

        // ✅ STEP 1: get gradebook (to extract classId)
        const baseRes = await apiClient.get(
          `/teacher/gradebook/${id}`
        );

        const classId = baseRes.data?.class?.id;

        if (!classId) {
          throw new Error("classId not found in gradebook");
        }

        setClassId(classId);

        console.log("✅ classId:", classId);

        // ✅ STEP 2: get terms
        const termRes = await apiClient.get(
          `/teacher/terms/${classId}`
        );

        const backendTerms = termRes.data || [];

        const normalizedTerms = backendTerms;

        setTerms(normalizedTerms);

        const firstTerm = normalizedTerms.find(
          (t) => t.name === "Term 2"
        );

        if (!firstTerm) {
          throw new Error("Term 2 not found");
        }

        const termId = firstTerm.id;

       // 🔒 VALIDATE TERM LOCK
      const validationRes = await apiClient.get(
        `/terms/validate`,
        {
          params: {
            classId,
            term: firstTerm.name,
          },
        }
      );

      if (validationRes.data.status === "locked") {
        setTermLocked(true);
        setLockMessage(validationRes.data.message);
      } else {
        setTermLocked(false);
        setLockMessage("");
      }

        console.log("✅ termId:", termId);

        // ✅ SAVE FULL TERM
        setSelectedTermData(firstTerm);

        // ✅ STEP 3: fetch gradebook with term
        const finalRes = await apiClient.get(
          `/teacher/gradebook/${id}`,
          {
            params: { termId },
          }
        );

        setSelectedTerm(termId);
        setData(finalRes.data);

        // 🆕 FETCH ATTENDANCE (RIGHT PLACE)
        await fetchAttendance(classId, firstTerm);

        console.log("✅ Gradebook loaded");

      } catch (err) {
        console.error("💥 INIT FAILED", err);
        setError(err.message || "Failed to load gradebook");
      } finally {
        setLoading(false);
      }
    };

    if (id) init();
  }, [id]);

  // 🔄 RELOAD GRADEBOOK WHEN TERM CHANGES
useEffect(() => {
  if (!selectedTerm || !id) return;

  const reloadTermData = async () => {
    try {
      setLoading(true);

      const selected = terms.find(
        (t) => Number(t.id) === Number(selectedTerm)
      );

      // 🔒 validate lock
      const validationRes = await apiClient.get(
        `/terms/validate`,
        {
          params: {
            classId,
            term: selected?.name,
          },
        }
      );

      if (validationRes.data.status === "locked") {
        setTermLocked(true);
        setLockMessage(validationRes.data.message);
      } else {
        setTermLocked(false);
        setLockMessage("");
      }

      // 📦 reload gradebook
      const res = await apiClient.get(
        `/teacher/gradebook/${id}`,
        {
          params: {
            termId: selectedTerm,
          },
        }
      );

      setData(res.data);

      // 🆕 keep selected term object updated
      setSelectedTermData(selected);

      // 📊 reload attendance
      await fetchAttendance(classId, selected);

    } catch (err) {
      console.error("❌ Term switch failed", err);

      alert(
        "No active records found for this term."
      );
    } finally {
      setLoading(false);
    }
  };

  reloadTermData();
}, [selectedTerm, id, classId, terms]);  

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
    const assignments = [...(data?.assignments || [])].sort(
    (a, b) =>
      new Date(a.dateAssigned || a.createdAt) -
      new Date(b.dateAssigned || b.createdAt)
  );

   // ✅ DRAG HANDLER
      const handleDragEnd = async (result) => {
        if (termLocked) return;

        if (!result.destination) return;

        const items = Array.from(assignments);
        const [moved] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, moved);

        try {
          await apiClient.put("/teacher/assignment/reorder", {
            assignments: items.map((a, index) => ({
              id: a.id,
              position: index,
            })),
          });

          setData((prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              assignments: items,
            };
          });
        } catch (err) {
          console.error("Reorder failed", err);
        }
      };

  // 🆕 GET ABSENT DAYS (HELPER)
  const getAbsentDays = (studentId) => {
    return attendanceMap[studentId] || 0;
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

      const maxPoints = a.maxPoints || 100;
      const percentage = (scoreObj.score / maxPoints) * 100;

      categories[type].total += percentage;
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

      const equal = uniqueTypes.length > 0 ? 1 / uniqueTypes.length : 1;

      return uniqueTypes.map((type) => ({ type, weight: equal }));
    }

    const totalWeight = weights.reduce(
      (sum, w) => sum + (Number(w.weight) || 0),
      0
    );

    if (totalWeight <= 0) {
      console.warn("⚠️ Invalid category weights. Falling back to equal weights.");

      const uniqueTypes = [
        ...new Set(assignments.map((a) => a.type || "HOMEWORK")),
      ];

      const equal = uniqueTypes.length > 0 ? 1 / uniqueTypes.length : 1;

      return uniqueTypes.map((type) => ({ type, weight: equal }));
    }

    if (Math.abs(totalWeight - 1) > 0.01) {
      console.warn("⚠️ Category weights do not sum to 1. Auto-normalizing...");

      return weights.map((w) => ({
        ...w,
        weight: (Number(w.weight) || 0) / totalWeight,
      }));
    }

    return weights.map((w) => ({
      ...w,
      weight: Number(w.weight) || 0,
    }));
  };
    // ✅ FINAL GRADE
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

    if (appliedWeight === 0) return null;

    return total / appliedWeight;
  };

  const getFinalGrade = (student) => {
    const categoryAverages = getCategoryAverages(student);
    const weights = getCategoryWeights();
    return calculateFinalGrade(categoryAverages, weights);
  };

    // 🔥 FIXED ADD ASSIGNMENT (MODAL VERSION)
    const handleAddAssignment = async () => {
      if (termLocked) {
        alert("This term has been locked.");
        return;
      }

      if (!form.title) return;

      try {
        const res = await apiClient.post("/teacher/assignment", {
          title: form.title,
          teacherSubjectId: id,
          type: form.type,
          maxPoints: Number(form.maxPoints),
          dateAssigned: form.dateAssigned,
          dueDate: form.dueDate,
          termId: selectedTerm,
        });

        setData((prev) => ({
          ...prev,
          assignments: [...prev.assignments, { ...res.data, scores: [] }],
        }));

        setShowModal(false);

        setForm({
          title: "",
          type: "ASSIGNMENT",
          maxPoints: 100,
          dateAssigned: "",
          dueDate: "",
        });
      } catch (err) {
        console.error("Failed to create assignment", err);
      }
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
    if (!assignments || assignments.length === 0) {
      return null;
    }

    let total = 0;
    let totalWeight = 0;

    assignments.forEach((a) => {
      const scoreObj = a.scores?.find(
        (s) => String(s.studentId) === String(student.id)
      );

      // Ignore blank/ungraded assignments
      if (
        !scoreObj ||
        scoreObj.score === null ||
        scoreObj.score === undefined ||
        scoreObj.score === ""
      ) {
        return;
      }

      const weight = a.weight || 1;

      total += Number(scoreObj.score) * weight;
      totalWeight += weight;
    });

    // No graded assignments
    if (totalWeight === 0) {
      return null;
    }

    return total / totalWeight;
  };

  const getGrade = (avg) => {
    if (avg == null) return "—";

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
    // ✅ RANKING
  const { ranked: rankedStudents, positionMap } = useMemo(() => {
    return rankStudents(students || [], getFinalGrade);
  }, [students, assignments, data?.categoryWeights]);

  const getPosition = (studentId) => positionMap[studentId] || "-";

// 🔒 LOCK TOGGLE
    const handleToggleLock = async (assignment) => {
      if (termLocked) {
        alert("This term has been locked.");
        return;
      }

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

  const handleDeleteAssignment = async (assignmentId) => {
    if (termLocked) {
      alert("This term has been locked.");
      return;
    }

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
      if (termLocked) {
        alert("This term has been locked.");
        return;
      }

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
        if (!prev) return prev;

        return {
          ...prev,
          assignments: prev.assignments.map((a) =>
            a.id === id
              ? { ...a, weight: weightNumber }
              : a
          ),
        };
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
      "Absent", // 🆕 ADDED
    ];

    const rows = students.map((student) => {
      const scores = assignments.map((a) => {
        const scoreObj = a.scores?.find(
          (s) => String(s.studentId) === String(student.id)
        );
        return scoreObj ? scoreObj.score : "";
      });

      const final = getStudentAverage(student);
      const absent = getAbsentDays(student.id);

      return [
        `${student.firstName} ${student.lastName}`,
        ...scores,
        final != null ? final.toFixed(1) : "",
        absent,
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
    // 🧱 CSV IMPORT
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
            (s) =>
              `${s.firstName} ${s.lastName}`.trim() === studentName
          );

          if (!student) return;

          row.slice(1).forEach((value, index) => {
            const assignmentTitle = header[index + 1]?.trim();
            const assignment = assignmentMap[assignmentTitle];

            if (!assignment) return;
            if (assignment.isLocked) return;
            if (value === "" || value === null || value === undefined) return;

            const score = Number(value);

            if (isNaN(score) || score < 0) return;

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
          // re-run init logic safely
          navigate(0);
        } catch (err) {
          console.error("Import failed", err);
          alert("Import failed ❌");
        }
      },
    });
  };

  // 🧾 GENERATE TRANSCRIPTS
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

  // 🧠 SCORE SAVE
    const handleScoreChange = async (
      studentId,
      assignmentId,
      value,
      isLocked
    ) => {

      // 🔒 TERM LOCK
      if (termLocked) {
        alert("This term has been locked.");
        return;
      }

      // 🔒 ASSIGNMENT LOCK
      if (isLocked) return;

      if (value === "") return;

      const score = Number(value);
      const assignment = assignments.find((a) => a.id === assignmentId);

      if (!assignment) return;
      if (isNaN(score) || score < 0) return;

      if (score > (assignment.maxPoints || 100)) {
        alert("Score cannot exceed max points");
        return;
      }

      try {
        setSaving(true);

        await apiClient.post("/teacher/score", {
          studentId,
          assignmentId,
          score,
        });

        setData((prev) => {
          if (!prev) return prev;

          return {
            ...prev,
            assignments: prev.assignments.map((a) => {
              if (a.id !== assignmentId) return a;

              const existing = a.scores?.find(
                (s) => String(s.studentId) === String(studentId)
              );

              let updatedScores;

              if (existing) {
                updatedScores = a.scores.map((s) =>
                  String(s.studentId) === String(studentId)
                    ? { ...s, score }
                    : s
                );
              } else {
                updatedScores = [
                  ...(a.scores || []),
                  { studentId, score },
                ];
              }

              return {
                ...a,
                scores: updatedScores,
              };
            }),
          };
        });

      setLocalScores((prev) => {
        const copy = { ...prev };
        delete copy[`${studentId}-${assignmentId}`];
        return copy;
      });
    } catch (err) {
      console.error("Failed to save score", err);
    } finally {
      setSaving(false);
    }
  };
    console.log("RENDER STATE:", { loading, error, data });

  if (!selectedTerm && terms.length === 0)
    return <div className="p-6">Setting up gradebook...</div>;

  if (loading)
    return <div className="p-6">Loading gradebook...</div>;

  if (error)
    return <div className="p-6 text-red-500">{error}</div>;

  if (!data)
    return <div className="p-6">No gradebook data</div>;

  return (
    <div className="p-6" onClick={() => setContextMenu(null)}>
      <BackButton />

      <h1 className="text-2xl font-bold mb-4">
        {data.class?.name} - {data.subject?.name}
      </h1>
      {/* 🧱 TERM SELECTOR */}
      <div className="mb-4">
        <select
          value={selectedTerm ?? ""}
          onChange={(e) =>
            setSelectedTerm(Number(e.target.value))
          }
          className="border p-2"
        >
          {terms.length === 0 && (
            <option value="">Setting up term...</option>
          )}

          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {saving && <p className="text-sm text-gray-500 mb-2">Saving...</p>}

      {termLocked && (
        <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Locked:</strong>{" "}
          {lockMessage ||
            "This term has been finalized and locked. Editing has been disabled."}
        </div>
      )}

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
          disabled
          title="Coming soon"
          className="bg-gray-400 text-white px-4 py-2 cursor-not-allowed opacity-70"
        >
          Generate Transcripts (will be unlocked in a future update)
        </button>
      </div>

      {/* 🔥 NEW BUTTON */}
      <div className="mb-4">
        <button
          disabled={termLocked}
          onClick={() => {
            if (termLocked) return;
            setShowModal(true);
          }}
          className={`bg-blue-600 text-white px-4 py-2 rounded ${
            termLocked ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          + New Assignment
        </button>
      </div>

      {/* TABLE */}
      <div>
        <table className="min-w-full border border-gray-300">
          <thead>
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="assignments" direction="horizontal">
                {(provided) => (
                  <tr
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="bg-gray-100"
                  >
                    <th className="border px-4 py-2 text-left">
                      Student
                    </th>

                    <th className="border p-2">Percent</th>
                    <th className="border p-2">Grade</th>
                    <th className="border p-2">Absent</th>

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

                              <input
                                id={`title-${a.id}`}
                                defaultValue={a.title}
                                disabled={termLocked}
                                onBlur={(e) =>
                                  handleRenameAssignment(
                                    a.id,
                                    e.target.value
                                  )
                                }
                                className={`border p-1 w-24 text-sm text-center ${
                                  termLocked
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : ""
                                }`}
                              />

                              <span className="text-xs text-gray-500">
                                {a.type || "HOMEWORK"}
                              </span>

                              <span className="text-xs">
                                {a.isLocked ? "🔒" : ""}
                              </span>

                              <input
                                type="number"
                                value={a.weight || 1}
                                disabled={termLocked}
                                onChange={(e) =>
                                  handleWeightChange(
                                    a.id,
                                    e.target.value
                                  )
                                }
                                className={`w-16 border text-center text-sm ${
                                  termLocked
                                    ? "bg-gray-100 cursor-not-allowed"
                                    : ""
                                }`}
                              />
                            </div>
                          </th>
                        )}
                      </Draggable>
                    ))}

                    {provided.placeholder}

                    <th className="border p-2">Position</th>
                  </tr>
                )}
              </Droppable>
            </DragDropContext>
          </thead>

          <tbody>
            {rankedStudents.map((student) => {
              const total = getStudentTotal(student);
              const final = getFinalGrade(student);
              const avg = final;
              const grade = getGrade(final);
              const position = getPosition(student.id);
              const absent = getAbsentDays(student.id);

              return (
                <tr key={student.id}>
                  <td className="border px-4 py-2">
                    {student.firstName} {student.lastName}
                  </td>

                  <td className="border p-2 font-bold">
                    {avg == null ? "—" : `${Math.round(avg)}%`}
                  </td>

                  <td
                    className={`border p-2 font-bold ${getGradeColor(
                      grade
                    )}`}
                  >
                    {formatGrade(grade)}
                  </td>

                  <td className="border p-2 font-semibold text-center">
                    {absent}
                  </td>

                  {assignments.map((a) => {
                    const sid = student.id || student.studentId;
                    const key = `${sid}-${a.id}`;
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
                          disabled={a.isLocked || termLocked}
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

                        <div className="text-xs text-gray-500">
                          / {a.maxPoints || 100}
                        </div>
                      </td>
                    );
                  })}

                  <td className="border p-2">{position}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 🔥 MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-96 space-y-3">
            <h2 className="text-lg font-semibold">New Assignment</h2>

            <input
              placeholder="Title"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="w-full border p-2"
            />

            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value })
              }
              className="w-full border p-2"
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
              className="w-full border p-2"
            />

            <div>
              <label className="block text-sm font-semibold">
                Date Assigned
              </label>
              <input
                type="date"
                value={form.dateAssigned}
                onChange={(e) =>
                  setForm({ ...form, dateAssigned: e.target.value })
                }
                className="w-full border p-2"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold">
                Due Date
              </label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) =>
                  setForm({ ...form, dueDate: e.target.value })
                }
                className="w-full border p-2"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1 border"
              >
                Cancel
              </button>

              <button
                onClick={handleAddAssignment}
                className="bg-green-600 text-white px-3 py-1"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

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
