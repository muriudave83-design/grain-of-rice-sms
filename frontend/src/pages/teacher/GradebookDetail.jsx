import { useEffect, useRef, useState } from "react";
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
import { formatGrade, getLetterGrade } from "../../utils/grading";
import { fitAssignmentMenuToViewport } from "../../utils/assignmentMenuPosition";
import {
  beginSave,
  beginConfirmedOverwrite,
  acceptAuthoritativeValue,
  editSaveField,
  failSave,
  finishSave,
  hasUnresolvedSaves,
} from "../../utils/reliableSaveState";
import useUnsavedChangesGuard from "../../utils/useUnsavedChangesGuard";
import { calculateAssignmentWeightedGrade } from "../../utils/assignmentWeightedGrade";

const PUBLISHED_DELETE_CONFIRMATION = "DELETE PUBLISHED ASSIGNMENT";

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

  // 🔥 NEW MODAL STATE
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    title: "",
    type: "ASSIGNMENT",
    maxPoints: 100,
    dateAssigned: "",
    dueDate: "",
  });

  const [scoreSaveStates, setScoreSaveStates] = useState({});
  const scoreSaveStatesRef = useRef(scoreSaveStates);
  useEffect(() => { scoreSaveStatesRef.current = scoreSaveStates; }, [scoreSaveStates]);
  const hasUnresolvedScores = hasUnresolvedSaves(scoreSaveStates);
  const confirmDiscardScores = useUnsavedChangesGuard(scoreSaveStates, scoreSaveStatesRef);

  const [contextMenu, setContextMenu] = useState(null);
  const contextMenuRef = useRef(null);
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [maximumPointsDialog, setMaximumPointsDialog] = useState(null);

  // 🧱 TERMS
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState(null);

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
        setData(baseRes.data);

        if (normalizedTerms.length === 0) {
          setError("No term is configured for this class. Contact an administrator.");
          return;
        }

        // A single class term is unambiguous. With multiple terms, require the
        // teacher to choose because the current isActive data is not reliable.
        setSelectedTerm(
          normalizedTerms.length === 1 ? normalizedTerms[0].id : null
        );

      } catch (err) {
        console.error("💥 INIT FAILED", err);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load gradebook"
        );
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

      // The selected object came from this class's term endpoint, so use its
      // exact lock state instead of looking up another term by name.
      if (selected?.isLocked) {
        setTermLocked(true);
        setLockMessage("This term is locked.");
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

  useEffect(() => {
    if (!contextMenu) return undefined;
    const closeOutside = (event) => {
      if (!contextMenuRef.current?.contains(event.target)) setContextMenu(null);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setContextMenu(null);
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const handleRightClick = (e, assignment) => {
    e.preventDefault();
    e.stopPropagation();

    const triggerRect = e.currentTarget.getBoundingClientRect();
    const position = fitAssignmentMenuToViewport({
      clientX: e.clientX || triggerRect.right,
      clientY: e.clientY || triggerRect.bottom,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    setContextMenu({
      ...position,
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
          alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to reorder assignments");
        }
      };

  // 🆕 GET ABSENT DAYS (HELPER)
  const getAbsentDays = (studentId) => {
    return attendanceMap[studentId] || 0;
  };

    // 🔥 FIXED ADD ASSIGNMENT (MODAL VERSION)
    const handleAddAssignment = async () => {
      if (termLocked) {
        alert("This term has been locked.");
        return null;
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
        alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to create assignment");
      }
    };

  const getStudentAverage = (student) => {
    return calculateAssignmentWeightedGrade(student.id, assignments);
  };

  const getGrade = (avg) => {
    if (avg == null) return "—";

    return getLetterGrade(avg);
  };

  const getGradeColor = (grade) => {
    if (!grade) return "text-gray-500";
    if (grade.startsWith("A")) return "text-green-600";
    if (grade.startsWith("B")) return "text-blue-600";
    if (grade.startsWith("C")) return "text-yellow-600";
    if (grade.startsWith("D")) return "text-orange-600";
    return "text-red-600";
  };
    // ✅ RANKING
  const alphabeticalStudents = [...(students || [])].sort((left, right) =>
    `${left.firstName} ${left.lastName}`.localeCompare(`${right.firstName} ${right.lastName}`),
  );

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
        alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to update assignment lock");
      }
    };

  const removeDeletedAssignment = (assignmentId) => {
    setData((prev) => ({
      ...prev,
      assignments: prev.assignments.filter((assignment) => assignment.id !== assignmentId),
    }));
    setScoreSaveStates((prev) => Object.fromEntries(
      Object.entries(prev).filter(([key]) => !key.endsWith(`-${assignmentId}`)),
    ));
    setContextMenu(null);
    setDeleteDialog(null);
  };

  const deleteAssignment = async (assignment, confirmation) => {
    try {
      await apiClient.delete(`/teacher/assignment/${assignment.id}`, {
        data: confirmation ? { confirmation } : {},
      });
      removeDeletedAssignment(assignment.id);
    } catch (err) {
      console.error("Delete failed", err);
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to delete assignment";
      if (deleteDialog) setDeleteDialog((prev) => ({ ...prev, deleting: false, error: message }));
      else alert(message);
    }
  };

  const handleDeleteAssignment = async (assignment) => {
    if (termLocked) {
      alert("This term has been locked.");
      return;
    }
    if (assignment.deletionStatus === "PUBLISHED") {
      try {
        await apiClient.delete(`/teacher/assignment/${assignment.id}`, { data: {} });
      } catch (err) {
        const details = err?.response?.data;
        if (details?.deletionStatus === "PUBLISHED") {
          setDeleteDialog({
            assignment: { ...assignment, scoreCount: details.scoreCount, publishedGradeCount: details.publishedGradeCount },
            confirmationPhrase: details.requiredConfirmation || PUBLISHED_DELETE_CONFIRMATION,
            published: true,
            confirmation: "",
            deleting: false,
            error: "",
          });
          setContextMenu(null);
          return;
        }
        alert(details?.message || err?.message || "Failed to prepare assignment deletion");
      }
      return;
    }
    if ((assignment.scoreCount ?? assignment.scores?.length ?? 0) > 0) {
      setDeleteDialog({ assignment, confirmationPhrase: "DELETE ASSIGNMENT", published: false, confirmation: "", deleting: false, error: "" });
      setContextMenu(null);
      return;
    }
    if (window.confirm(`Delete assignment '${assignment.title}'?`)) await deleteAssignment(assignment);
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
        alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to rename assignment");
      }
    };

  const handleMaximumPointsUpdate = async (event) => {
    event.preventDefault();
    const next = Number(maximumPointsDialog.value);
    if (!Number.isFinite(next) || next <= 0) {
      setMaximumPointsDialog((current) => ({ ...current, error: "Maximum points must be a positive number." }));
      return;
    }
    if (!Number.isInteger(next * 100)) {
      setMaximumPointsDialog((current) => ({ ...current, error: "Maximum points supports at most two decimal places." }));
      return;
    }
    setMaximumPointsDialog((current) => ({ ...current, saving: true, error: "" }));
    try {
      const { data: updated } = await apiClient.patch(
        `/teacher/assignment/${maximumPointsDialog.assignment.id}/max-points`,
        { maxPoints: next, expectedMaxPoints: maximumPointsDialog.assignment.maxPoints },
      );
      setData((current) => ({
        ...current,
        assignments: current.assignments.map((assignment) => assignment.id === updated.id ? { ...assignment, ...updated } : assignment),
      }));
      setMaximumPointsDialog(null);
    } catch (err) {
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to update maximum points";
      setMaximumPointsDialog((current) => ({ ...current, saving: false, error: message }));
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
      alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to update assignment weight");
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

    const rows = alphabeticalStudents.map((student) => {
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
            scores: a.scores || [],
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
              expectedScore: assignment.scores.find(
                (entry) => String(entry.studentId) === String(student.id)
              )?.score ?? null,
            });
          });
        });

        try {
          const response = await apiClient.post("/teacher/score/bulk", { updates });
          const { updated = 0, conflicted = 0, skippedLocked = 0, invalid = 0 } = response.data;
          alert(`Import complete: ${updated} updated, ${conflicted} conflicted, ${skippedLocked} locked, ${invalid} invalid.`);
          // re-run init logic safely
          navigate(0);
        } catch (err) {
          console.error("Import failed", err);
          alert(err?.response?.data?.message || err?.response?.data?.error || err?.message || "Import failed");
        }
      },
    });
  };

  // 🧠 SCORE SAVE
    const handleScoreChange = async (
      studentId,
      assignmentId,
      value,
      isLocked,
      serverValue
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

      const key = `${studentId}-${assignmentId}`;
      const savingState = beginSave(scoreSaveStatesRef.current[key], serverValue);
      const sequence = savingState.sequence;
      scoreSaveStatesRef.current = { ...scoreSaveStatesRef.current, [key]: savingState };
      setScoreSaveStates(scoreSaveStatesRef.current);
      try {

        const response = await apiClient.post("/teacher/score", {
          studentId,
          assignmentId,
          score,
          expectedScore: savingState.serverValue,
        });

        if (scoreSaveStatesRef.current[key]?.sequence !== sequence) return;

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
                    ? response.data
                    : s
                );
              } else {
                updatedScores = [
                  ...(a.scores || []),
                  response.data,
                ];
              }

              return {
                ...a,
                scores: updatedScores,
              };
            }),
          };
        });

      setScoreSaveStates((previous) => ({
        ...previous,
        [key]: finishSave(previous[key], sequence, response.data.score),
      }));
    } catch (err) {
      console.error("Failed to save score", err);
      if (!err?.response) {
        try {
          const refreshed = await apiClient.get(`/teacher/gradebook/${id}`, { params: { termId: selectedTerm } });
          const authoritative = refreshed.data.assignments?.find((item) => item.id === assignmentId)?.scores?.find((item) => String(item.studentId) === String(studentId))?.score ?? null;
          if (scoreSaveStatesRef.current[key]?.sequence === sequence && authoritative === score) {
            setData(refreshed.data);
            setScoreSaveStates((previous) => ({ ...previous, [key]: finishSave(previous[key], sequence, authoritative) }));
            return;
          }
        } catch (reconcileError) {
          console.error("Score reconciliation failed", reconcileError);
        }
      }
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save score";
      setScoreSaveStates((previous) => ({
        ...previous,
        [key]: failSave(previous[key], sequence, message, err?.response?.status === 409, err?.response?.data?.current?.score),
      }));
    }
  };

  const acceptSavedScore = (key) => {
    const current = scoreSaveStatesRef.current[key];
    if (!current || current.status !== "Conflict") return;
    const accepted = acceptAuthoritativeValue(current, current.authoritativeValue);
    scoreSaveStatesRef.current = { ...scoreSaveStatesRef.current, [key]: accepted };
    setScoreSaveStates(scoreSaveStatesRef.current);
  };

  const overwriteScore = (studentId, assignmentId, isLocked, key) => {
    const current = scoreSaveStatesRef.current[key];
    if (!current || current.status !== "Conflict") return;
    if (!globalThis.confirm("Overwrite the newer saved score with your value?")) return;
    const prepared = beginConfirmedOverwrite(current, current.authoritativeValue);
    scoreSaveStatesRef.current = { ...scoreSaveStatesRef.current, [key]: prepared };
    setScoreSaveStates(scoreSaveStatesRef.current);
    handleScoreChange(studentId, assignmentId, prepared.draftValue, isLocked, prepared.serverValue);
  };

  const editScore = (key, serverValue, draftValue) => {
    const edited = editSaveField(scoreSaveStatesRef.current[key], serverValue, draftValue);
    scoreSaveStatesRef.current = { ...scoreSaveStatesRef.current, [key]: edited };
    setScoreSaveStates(scoreSaveStatesRef.current);
  };
    console.log("RENDER STATE:", { loading, error, data });

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
          onChange={(e) => {
            if (confirmDiscardScores()) {
              scoreSaveStatesRef.current = {};
              setScoreSaveStates({});
              setSelectedTerm(Number(e.target.value));
            }
          }}
          className="border p-2"
        >
          <option value="" disabled>
            {terms.length > 1 ? "Select a term" : "Select term"}
          </option>

          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} — {t.academicYear}
            </option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500 mb-2">Edit a mark, then press Enter or leave the field to save. Marks can be corrected until the assignment or term is locked.</p>
      {hasUnresolvedScores && <p className="text-sm text-amber-700 mb-2">Some marks are Unsaved, Saving, Failed, or in Conflict.</p>}

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
                                  type="button"
                                  aria-haspopup="menu"
                                  aria-expanded={contextMenu?.assignment.id === a.id}
                                  aria-label={`Assignment actions for ${a.title}`}
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
                                value={a.weight ?? 1}
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

                  </tr>
                )}
              </Droppable>
            </DragDropContext>
          </thead>

          <tbody>
            {alphabeticalStudents.map((student) => {
              const final = getStudentAverage(student);
              const avg = final;
              const grade = getGrade(final);
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
                          min="0"
                          max={a.maxPoints ?? 100}
                          step="any"
                          disabled={a.isLocked || termLocked}
                          value={
                            scoreSaveStates[key]?.draftValue ??
                            (scoreObj ? scoreObj.score : "")
                          }
                          onChange={(e) => editScore(key, scoreObj?.score ?? null, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                          }}
                          onBlur={(e) =>
                            handleScoreChange(
                              student.id,
                              a.id,
                              e.target.value,
                              a.isLocked,
                              scoreObj?.score ?? null
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
                        {scoreSaveStates[key] && (
                          <div className={`text-xs ${scoreSaveStates[key].status === "Failed" || scoreSaveStates[key].status === "Conflict" ? "text-red-700" : "text-gray-600"}`}>
                            {scoreSaveStates[key].status}
                            {scoreSaveStates[key].error && <span className="ml-1">— {scoreSaveStates[key].error}</span>}
                            {scoreSaveStates[key].status === "Failed" && (
                              <button type="button" className="ml-2 underline" onClick={() => handleScoreChange(student.id, a.id, scoreSaveStates[key].draftValue, a.isLocked, scoreSaveStates[key].serverValue)}>Retry</button>
                            )}
                            {scoreSaveStates[key].status === "Conflict" && (
                              <span className="ml-2 space-x-2">
                                <button type="button" className="underline" onClick={() => acceptSavedScore(key)}>Use saved value</button>
                                <button type="button" className="underline" onClick={() => overwriteScore(student.id, a.id, a.isLocked, key)}>Overwrite with my value</button>
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                    );
                  })}

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

      {deleteDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-assignment-title">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <h2 id="delete-assignment-title" className="text-lg font-bold text-gray-900">
              {deleteDialog.published ? "Delete Published Assignment Data?" : "Delete this assignment?"}
            </h2>
            <p className="mt-3 text-sm text-gray-700">
              This assignment contains <strong>{deleteDialog.assignment.scoreCount ?? deleteDialog.assignment.scores?.length ?? 0} student scores</strong>.
              Deleting it will permanently remove the assignment and all of its scores.
            </p>
            {deleteDialog.published && (
              <div className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-900">
                <p>This assignment contributes to <strong>{deleteDialog.assignment.publishedGradeCount} published final grades</strong>.</p>
                <p className="mt-1">Those current Grades will be invalidated. Recalculate the remaining assignments and explicitly republish corrected final Grades.</p>
                <p className="mt-1">Already-issued Report Cards and Transcripts will remain unchanged.</p>
              </div>
            )}
            <p className="mt-2 text-sm font-semibold text-red-700">This cannot be undone.</p>
            <label htmlFor="delete-assignment-confirmation" className="mt-4 block text-sm font-medium text-gray-700">
              Type <strong>{deleteDialog.confirmationPhrase}</strong> to confirm
            </label>
            <input
              id="delete-assignment-confirmation"
              value={deleteDialog.confirmation}
              onChange={(event) => setDeleteDialog((prev) => ({ ...prev, confirmation: event.target.value, error: "" }))}
              className="mt-1 w-full rounded border p-2 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              autoFocus
            />
            {deleteDialog.error && <p role="alert" className="mt-2 text-sm text-red-700">{deleteDialog.error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteDialog(null)} disabled={deleteDialog.deleting} className="rounded border px-4 py-2 text-sm">Cancel</button>
              <button
                type="button"
                disabled={deleteDialog.confirmation !== deleteDialog.confirmationPhrase || deleteDialog.deleting}
                onClick={() => {
                  setDeleteDialog((prev) => ({ ...prev, deleting: true, error: "" }));
                  deleteAssignment(deleteDialog.assignment, deleteDialog.confirmation);
                }}
                className="rounded bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {deleteDialog.deleting ? "Deleting…" : deleteDialog.published ? "Delete Published Assignment Data" : "Delete Assignment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {maximumPointsDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-labelledby="maximum-points-title">
          <form onSubmit={handleMaximumPointsUpdate} className="w-full max-w-sm rounded-lg bg-white p-5 shadow-xl">
            <h2 id="maximum-points-title" className="text-lg font-bold text-gray-900">Edit Maximum Points</h2>
            <p className="mt-1 text-sm text-gray-600">{maximumPointsDialog.assignment.title}</p>
            <label htmlFor="maximum-points-value" className="mt-4 block text-sm font-medium text-gray-700">Maximum points</label>
            <input id="maximum-points-value" type="number" min="0.01" step="0.01" required autoFocus value={maximumPointsDialog.value} onChange={(event) => setMaximumPointsDialog((current) => ({ ...current, value: event.target.value, error: "" }))} className="mt-1 w-full rounded border p-2" />
            <p className="mt-2 text-xs text-gray-500">Existing student scores will be preserved.</p>
            {maximumPointsDialog.error && <p role="alert" className="mt-2 text-sm text-red-700">{maximumPointsDialog.error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setMaximumPointsDialog(null)} disabled={maximumPointsDialog.saving} className="rounded border px-4 py-2 text-sm">Cancel</button>
              <button type="submit" disabled={maximumPointsDialog.saving} className="rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400">{maximumPointsDialog.saving ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          role="menu"
          aria-label={`Actions for ${contextMenu.assignment.title}`}
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
        >
          <div className="bg-white shadow-lg rounded-md border w-40 py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const input = document.getElementById(
                  `title-${contextMenu.assignment.id}`
                );
                input?.focus();
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-sm"
            >
              ✏️ Rename
            </button>

            <button
              type="button"
              role="menuitem"
              disabled={termLocked || contextMenu.assignment.isLocked}
              onClick={() => {
                setMaximumPointsDialog({ assignment: contextMenu.assignment, value: String(contextMenu.assignment.maxPoints ?? 100), saving: false, error: "" });
                setContextMenu(null);
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-sm disabled:cursor-not-allowed disabled:text-gray-400"
            >
              Edit Maximum Points
            </button>

            <button
              type="button"
              role="menuitem"
              onClick={() =>
                handleToggleLock(contextMenu.assignment)
              }
              className="w-full px-3 py-2 text-left hover:bg-gray-100 cursor-pointer text-sm"
            >
              {contextMenu.assignment.isLocked
                ? "🔓 Unlock"
                : "🔒 Lock"}
            </button>

            <button
              type="button"
              role="menuitem"
              title={contextMenu.assignment.deletionStatus === "PUBLISHED" ? "Delete scores and invalidate current published Grades" : contextMenu.assignment.deletionStatus === "SCORED" ? "Deleting requires typed confirmation and removes all scores" : "Delete assignment"}
              onClick={() => handleDeleteAssignment(contextMenu.assignment)}
              className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-100"
            >
              {contextMenu.assignment.deletionStatus === "PUBLISHED" ? "Delete Published Assignment Data…" : contextMenu.assignment.deletionStatus === "SCORED" ? "🗑️ Delete scores & assignment…" : "🗑️ Delete"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
