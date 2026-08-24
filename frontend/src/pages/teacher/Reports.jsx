import { useEffect, useMemo, useState } from "react";
import apiClient from "../../services/apiClient";
import BackButton from "../../components/BackButton";
import { formatGrade } from "../../utils/grading";
import {
  displaySubjectComment,
  PRINT_MODE,
  reportsForMode,
} from "../../utils/reportCardPresentation";

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

  const [comments, setComments] = useState({});

  const saveComment = async (
    studentId,
    teacherSubjectId,
    subjectId,
    value
  ) => {
    try {
      if (!teacherSubjectId) return;

      await apiClient.post(
        "/teacher/report/comment",
        {
          studentId,
          teacherSubjectId,
          termId,
          comment: value,
        }
      );

      setComments((prev) => ({
        ...prev,
        [`${termId}-${studentId}-${subjectId}`]:
          value,
      }));
    } catch (err) {
      console.error(
        "SAVE COMMENT ERROR:",
        err.response?.data || err
      );
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to save comment"
      );
    }
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
    if (selectedStudentId) setPrintMode(PRINT_MODE.SELECTED);
  };

  const handlePrintAll = () => {
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
      setComments({});
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
      setComments({});
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
          onChange={(e) =>
            setClassId(e.target.value)
          }
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
            setTermId(Number(e.target.value));
            setReports([]);
            setSelectedStudentId("");
            setComments({});
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
          disabled={!selectedStudentId || loading || Boolean(printMode)}
          className="bg-green-600 text-white px-4 py-2"
        >
          Print Selected Student
        </button>

        <button
          onClick={handlePrintAll}
          disabled={reports.length === 0 || loading || Boolean(printMode)}
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
          {renderedReports.map((student) => {

            console.log("🧠 FULL STUDENT:", student);

            return (
              <div
                key={student.studentId}
                className="border p-6 rounded mb-6 print-card bg-white"
              >
                {/* HEADER */}
                <div className="mb-4 flex items-center gap-3">
                  <img
                    src="/logo.png"
                    alt="School Logo"
                    className="w-12 h-12 object-contain"
                  />

                  <div>
                    <h2 className="text-xl font-bold">
                      Grain of Rice Academy
                    </h2>

                    <p className="text-sm">
                      Official Report Card
                    </p>
                  </div>
                </div>

                {/* STUDENT INFO */}
                <div className="mb-4">
                  <p>
                    <strong>Student:</strong>{" "}
                    {student.name}
                  </p>

                  <p>
                    <strong>Admission Number:</strong>{" "}
                    {student.admissionNo || "—"}
                  </p>

                  <p>
                    <strong>Grade:</strong>{" "}
                    {selectedClassName}
                  </p>

                  <p>
                    <strong>Term:</strong>{" "}
                    {selectedTermName}
                  </p>
                </div>

                <hr className="my-3" />

                {/* SUBJECT TABLE */}
                <div className="mb-4">
                  <div className="report-subject-grid font-semibold border-b pb-2">
                    <span>Subject</span>
                    <span>Score</span>
                    <span>Grade</span>
                    <span>Teacher Comment</span>
                  </div>

                  {student.subjects.map((sub) => {
                    const key = `${termId}-${student.studentId}-${sub.subjectId}`;

                    return (
                      <div
                        key={key}
                        className="report-subject-grid py-2 border-b border-gray-100 items-start"
                      >
                        <span>
                          {sub.subjectName}
                        </span>

                        <span>
                          {sub.finalGrade === null ? "Incomplete" : `${sub.finalGrade}%`}
                        </span>

                        <span>{sub.finalGrade === null ? "—" : formatGrade(sub.letter)}</span>

                        <div>
                          {sub.canEditComment ? (
                            <textarea
                              aria-label={`${sub.subjectName} teacher comment for ${student.name}`}
                              className="border w-full p-2 print-hidden"
                              value={comments[key] ?? sub.comment ?? ""}
                              placeholder="Add subject comment"
                              onChange={(e) => {
                                const val = e.target.value;
                                setComments((prev) => ({ ...prev, [key]: val }));
                              }}
                              onBlur={(e) => saveComment(
                                student.studentId,
                                sub.teacherSubjectId,
                                sub.subjectId,
                                e.target.value
                              )}
                            />
                          ) : (
                            <p className="print-hidden whitespace-pre-wrap break-words text-gray-700">
                              {displaySubjectComment(sub.comment)}
                            </p>
                          )}
                          <p className="print-only whitespace-pre-wrap break-words">
                            {displaySubjectComment(comments[key] ?? sub.comment)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <hr className="my-3" />

                {/* ATTENDANCE */}
                <div className="mt-4 border-t pt-3">
                  <h3 className="font-bold mb-2">
                    Attendance
                  </h3>

                  <p>
                      <strong>Present:</strong>{" "}
                      {Number(student.present || 0)}
                    </p>

                    <p>
                      <strong>Absent:</strong>{" "}
                      {Number(student.absent || 0)}
                    </p>

                    <p>
                      <strong>Late:</strong>{" "}
                      {Number(student.late || 0)}
                    </p>
                  <p>
                    <strong>Attendance Rate:</strong>{" "}
                    {student.attendanceRate ?? 0}%
                  </p>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
