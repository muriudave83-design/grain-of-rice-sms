import { useEffect, useMemo, useRef, useState } from "react";
import apiClient from "../../services/apiClient";
import BackButton from "../../components/BackButton";
import TeacherReportCardSheet from "../../components/report-cards/TeacherReportCardSheet";
import {
  PRINT_MODE,
  reportsForMode,
} from "../../utils/reportCardPresentation";
import { acceptAuthoritativeValue, beginConfirmedOverwrite, beginSave, editSaveField, failSave, finishSave, hasUnresolvedSaves } from "../../utils/reliableSaveState";
import useUnsavedChangesGuard from "../../utils/useUnsavedChangesGuard";

export default function Reports() {
  const [classId, setClassId] = useState("");
  const [classes, setClasses] = useState([]);

  const [reports, setReports] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [printMode, setPrintMode] = useState(null);

  const [terms, setTerms] = useState([]);
  const [termId, setTermId] = useState(null);

  const [commentSaveStates, setCommentSaveStates] = useState({});
  const commentSaveStatesRef = useRef(commentSaveStates);
  useEffect(() => { commentSaveStatesRef.current = commentSaveStates; }, [commentSaveStates]);
  const confirmDiscardComments = useUnsavedChangesGuard(commentSaveStates, commentSaveStatesRef);
  const clearCommentSaveStates = () => {
    commentSaveStatesRef.current = {};
    setCommentSaveStates({});
  };

  const saveComment = async (
    studentId,
    subject,
    value
  ) => {
    const key = `${termId}-${studentId}-${subject.subjectId}`;
    const previous = commentSaveStatesRef.current[key];
    const saving = { ...beginSave(previous, subject.comment), serverToken: previous?.serverToken ?? subject.commentUpdatedAt ?? null };
    commentSaveStatesRef.current = { ...commentSaveStatesRef.current, [key]: saving };
    setCommentSaveStates(commentSaveStatesRef.current);
    try {
      if (!subject.teacherSubjectId) return;

      const response = await apiClient.post(
        "/teacher/report/comment",
        {
          studentId,
          teacherSubjectId: subject.teacherSubjectId,
          termId,
          comment: value,
          expectedUpdatedAt: saving.serverToken,
        }
      );

      if (commentSaveStatesRef.current[key]?.sequence !== saving.sequence) return;
      setCommentSaveStates((current) => ({ ...current, [key]: { ...finishSave(current[key], saving.sequence, response.data.comment), serverToken: response.data.updatedAt } }));
    } catch (err) {
      console.error(
        "SAVE COMMENT ERROR:",
        err.response?.data || err
      );
      if (!err?.response) {
        try {
          const refreshed = (await apiClient.get(`/teacher/report/${classId}?termId=${termId}`)).data;
          const refreshedStudent = refreshed.find((item) => item.studentId === studentId);
          const refreshedSubject = refreshedStudent?.subjects?.find((item) => item.subjectId === subject.subjectId);
          if (commentSaveStatesRef.current[key]?.sequence === saving.sequence && refreshedSubject?.comment === value) {
            setReports(refreshed);
            setCommentSaveStates((current) => ({ ...current, [key]: { ...finishSave(current[key], saving.sequence, value), serverToken: refreshedSubject.commentUpdatedAt } }));
            return;
          }
        } catch (reconcileError) { console.error("Comment reconciliation failed", reconcileError); }
      }
      const message = err?.response?.data?.message || err?.response?.data?.error || err?.message || "Failed to save comment";
      const authoritative = err?.response?.data?.current;
      setCommentSaveStates((current) => ({ ...current, [key]: { ...failSave(current[key], saving.sequence, message, err?.response?.status === 409, authoritative?.comment), ...(authoritative?.updatedAt ? { authoritativeToken: authoritative.updatedAt } : {}) } }));
    }
  };

  const acceptSavedComment = (studentId, subject) => {
    const key = `${termId}-${studentId}-${subject.subjectId}`;
    const current = commentSaveStatesRef.current[key];
    if (!current || current.status !== "Conflict") return;
    const accepted = acceptAuthoritativeValue(current, current.authoritativeValue, current.authoritativeToken);
    commentSaveStatesRef.current = { ...commentSaveStatesRef.current, [key]: accepted };
    setCommentSaveStates(commentSaveStatesRef.current);
  };

  const overwriteComment = (studentId, subject) => {
    const key = `${termId}-${studentId}-${subject.subjectId}`;
    const current = commentSaveStatesRef.current[key];
    if (!current || current.status !== "Conflict") return;
    if (!globalThis.confirm("Overwrite the newer saved comment with your value?")) return;
    const prepared = beginConfirmedOverwrite(current, current.authoritativeValue, current.authoritativeToken);
    commentSaveStatesRef.current = { ...commentSaveStatesRef.current, [key]: prepared };
    setCommentSaveStates(commentSaveStatesRef.current);
    saveComment(studentId, subject, prepared.draftValue);
  };

  const editComment = (key, value, subject) => {
    const previous = commentSaveStatesRef.current[key];
    const edited = {
      ...editSaveField(previous, subject.comment, value),
      serverToken: previous?.serverToken ?? subject.commentUpdatedAt ?? null,
    };
    commentSaveStatesRef.current = { ...commentSaveStatesRef.current, [key]: edited };
    setCommentSaveStates(commentSaveStatesRef.current);
  };

  useEffect(() => {
    if (!printMode) return undefined;

    let secondFrame;
    const firstFrame = requestAnimationFrame(() => {
      secondFrame = requestAnimationFrame(() => window.print());
    });
    const finishPrinting = () => setPrintMode(null);
    window.addEventListener("afterprint", finishPrinting, { once: true });

    return () => {
      cancelAnimationFrame(firstFrame);
      if (secondFrame) cancelAnimationFrame(secondFrame);
      window.removeEventListener("afterprint", finishPrinting);
    };
  }, [printMode]);

  const handlePrintSelected = () => {
    if (hasUnresolvedSaves(commentSaveStates)) return setError("Resolve Unsaved, Saving, Failed, or Conflict comments before printing.");
    if (reports.some((report) => report.subjects.some((subject) => subject.completenessState === "REVIEW_REQUIRED"))) return setError("An administrator must review assignment inclusion before printing.");
    if (selectedStudentId) setPrintMode(PRINT_MODE.SELECTED);
  };

  const handlePrintAll = () => {
    if (hasUnresolvedSaves(commentSaveStates)) return setError("Resolve Unsaved, Saving, Failed, or Conflict comments before printing.");
    if (reports.some((report) => report.subjects.some((subject) => subject.completenessState === "REVIEW_REQUIRED"))) return setError("An administrator must review assignment inclusion before printing.");
    if (reports.length) setPrintMode(PRINT_MODE.ALL);
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const res = await apiClient.get(
          "/teacher/classes"
        );

        setClasses(res.data);
      } catch (err) {
        console.error(err);
        setTerms([]);
        setTermId(null);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load terms"
        );
      }
    };

    fetchClasses();
  }, []);

  useEffect(() => {
    const fetchTerms = async () => {
      if (!classId) return;

      setTerms([]);
      setTermId(null);
      setReports([]);
      setSelectedStudentId("");
      clearCommentSaveStates();
      setError("");

      try {
        const res = await apiClient.get(
          `/teacher/terms/${classId}`
        );

        const classTerms = res.data || [];
        setTerms(classTerms);

        if (classTerms.length === 0) {
          setError("No term is configured for this class. Contact an administrator.");
        } else if (classTerms.length === 1) {
          setTermId(classTerms[0].id);
        }
      } catch (err) {
        console.error(err);
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            "Failed to load terms"
        );
      }
    };

    fetchTerms();
  }, [classId]);

  const handleGenerate = async () => {
    if (!confirmDiscardComments()) return;
    if (!classId || !termId) {
      alert("Select class and term");
      return;
    }

    try {
      setLoading(true);
      setError("");

      console.log("🚀 GENERATE CLICKED", {
        classId,
        termId,
      });

      const res = await apiClient.get(
        `/teacher/report/${classId}?termId=${termId}`
      );

      console.log(
        "📦 REPORT RESPONSE:",
        JSON.stringify(res.data, null, 2)
      );

      setReports(res.data);
      setSelectedStudentId("");
      clearCommentSaveStates();
    } catch (err) {
      console.error(
        "❌ GENERATE REPORT ERROR:",
        err.response?.data || err
      );

      setError("Failed to generate reports");
    } finally {
      setLoading(false);
    }
  };

  const studentOptions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return reports;
    return reports.filter((report) =>
      `${report.name} ${report.admissionNo || ""}`.toLowerCase().includes(normalizedSearch)
    );
  }, [reports, search]);

  const previewReports = selectedStudentId
    ? reportsForMode(reports, selectedStudentId, PRINT_MODE.SELECTED)
    : reports;
  const renderedReports = printMode
    ? reportsForMode(reports, selectedStudentId, printMode)
    : previewReports;
  const completeReportCount = reports.filter((report) =>
    report.subjects.every((subject) => subject.finalGrade !== null),
  ).length;

  const selectedClassName =
    classes.find((c) => c.id == classId)
      ?.name || "";

  const selectedTermName =
    terms.find((t) => t.id === termId)
      ?.name || "";

  return (
    <div className="p-6 max-w-5xl mx-auto print-area">
      <BackButton />

      <div className="flex items-center gap-4 mb-6 print-hidden">
        <img
          src="/logo.png"
          alt="School Logo"
          className="w-14 h-14"
        />

        <div>
          <h1 className="text-3xl font-bold">
            Grain of Rice Academy
          </h1>

          <p>Class Report Cards</p>
        </div>
      </div>

      <div className="mb-4 print-hidden">
        {hasUnresolvedSaves(commentSaveStates) && <p className="text-amber-700">Comments are pending: Unsaved, Saving, Failed, or Conflict. Resolve them before printing.</p>}
        <strong>Grade:</strong>{" "}
        {selectedClassName} <br />
        <strong>Term:</strong>{" "}
        {selectedTermName}
        <p className="mt-2 text-sm text-gray-600">
          Reports include all configured subjects for this class, including subjects taught by other teachers.
        </p>
        {reports.length > 0 && (
          <p className="mt-1 text-sm font-medium">
            {completeReportCount} of {reports.length} students have complete results.
          </p>
        )}
      </div>

      <div className="mb-6 flex gap-3 flex-wrap print-hidden">
        <select
          value={classId}
          onChange={(e) => {
            if (confirmDiscardComments()) {
              clearCommentSaveStates();
              setClassId(e.target.value);
            }
          }}
          className="border px-3 py-2"
        >
          <option value="">
            Select Class
          </option>

          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name || `Class ${c.id}`}
            </option>
          ))}
        </select>

        <select
          value={termId ?? ""}
          onChange={(e) => {
            if (confirmDiscardComments()) {
              setTermId(Number(e.target.value));
              setReports([]);
              setSelectedStudentId("");
              clearCommentSaveStates();
            }
          }}
          className="border px-3 py-2"
        >
          <option value="" disabled>
            {terms.length > 1 ? "Select a term" : "Select term"}
          </option>

          {terms.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} (
              {t.startDate
                ? new Date(
                    t.startDate
                  ).toLocaleDateString()
                : "No start"}
              {" → "}
              {t.endDate
                ? new Date(
                    t.endDate
                  ).toLocaleDateString()
                : "No end"}
              )
            </option>
          ))}
        </select>

        <input
          placeholder="Filter students by name or admission no..."
          value={search}
          onChange={(e) =>
            setSearch(e.target.value)
          }
          className="border px-3 py-2"
        />

        <select
          aria-label="Selected student"
          value={selectedStudentId}
          onChange={(e) => setSelectedStudentId(e.target.value)}
          className="border px-3 py-2 min-w-56"
          disabled={reports.length === 0}
        >
          <option value="">Class batch mode — all students</option>
          {studentOptions.map((student) => (
            <option key={student.studentId} value={student.studentId}>
              {student.name}{student.admissionNo ? ` — ${student.admissionNo}` : ""}
            </option>
          ))}
        </select>

        <button
          onClick={handleGenerate}
          className="bg-blue-600 text-white px-4 py-2"
        >
          Generate Class Reports
        </button>

        <button
          onClick={handlePrintSelected}
          disabled={!selectedStudentId || loading || Boolean(printMode) || hasUnresolvedSaves(commentSaveStates)}
          className="bg-green-600 text-white px-4 py-2"
        >
          Print Selected Student
        </button>

        <button
          onClick={handlePrintAll}
          disabled={reports.length === 0 || loading || Boolean(printMode) || hasUnresolvedSaves(commentSaveStates)}
          className="bg-emerald-700 text-white px-4 py-2"
        >
          Print All Report Cards
        </button>
      </div>

      {loading && (
        <p>Generating reports...</p>
      )}

      {error && (
        <p className="text-red-600">
          {error}
        </p>
      )}

      {!loading &&
      renderedReports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <div>
          {renderedReports.map((student) => (
            <TeacherReportCardSheet
              key={student.studentId}
              student={student}
              className={selectedClassName}
              termName={selectedTermName}
              termId={termId}
              commentSaveStates={commentSaveStates}
              onCommentChange={editComment}
              onCommentBlur={(subject, value) => saveComment(
                student.studentId,
                subject,
                value,
              )}
              onCommentRetry={(subject, value) => saveComment(student.studentId, subject, value)}
              onCommentUseSaved={(subject) => acceptSavedComment(student.studentId, subject)}
              onCommentOverwrite={(subject) => overwriteComment(student.studentId, subject)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
