import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import TeacherReportCardSheet from "../../components/report-cards/TeacherReportCardSheet";
import apiClient from "../../services/apiClient";
import { PRINT_MODE, reportsForMode } from "../../utils/reportCardPresentation";
import { reportPrintBlockReason } from "../../utils/reportPrintEligibility";

export default function AdminReportsPage() {
  const [classes, setClasses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [classId, setClassId] = useState("");
  const [termId, setTermId] = useState("");
  const [reports, setReports] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [printMode, setPrintMode] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([apiClient.get("/admin/classes"), apiClient.get("/terms")])
      .then(([classResponse, termResponse]) => {
        setClasses(classResponse.data || []);
        setTerms(termResponse.data || []);
      })
      .catch((requestError) => {
        setError(requestError?.response?.data?.message || "Unable to load classes and terms.");
      });
  }, []);

  useEffect(() => {
    setTermId("");
    setReports([]);
    setSelectedStudentId("");
    setError("");
  }, [classId]);

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

  const classTerms = useMemo(() => terms
    .filter((term) => String(term.classId) === String(classId))
    .sort((left, right) =>
      String(right.academicYear).localeCompare(String(left.academicYear)) ||
      new Date(right.startDate).getTime() - new Date(left.startDate).getTime(),
    ), [terms, classId]);

  const selectedClass = classes.find((schoolClass) => String(schoolClass.id) === String(classId));
  const selectedTerm = terms.find((term) => String(term.id) === String(termId));
  const renderedReports = printMode ? reportsForMode(reports, selectedStudentId, printMode) : reports;
  const completeReportCount = reports.filter((report) =>
    report.subjects.every((subject) =>
      subject.finalGrade !== null &&
      subject.completenessState !== "INCOMPLETE" &&
      subject.needsRevalidation !== true,
    ),
  ).length;

  const loadReports = async () => {
    if (!classId || !termId) {
      setError("Select a class and reporting term first.");
      return;
    }
    setLoading(true);
    setError("");
    setReports([]);
    setSelectedStudentId("");
    try {
      const response = await apiClient.get(`/admin/reports/classes/${classId}/terms/${termId}`);
      setReports(response.data.reports || []);
    } catch (requestError) {
      setError(requestError?.response?.data?.message || "Unable to load report cards.");
    } finally {
      setLoading(false);
    }
  };

  const beginPrint = (mode) => {
    const selectedId = mode === PRINT_MODE.SELECTED ? selectedStudentId : null;
    const blocked = reportPrintBlockReason(reports, selectedId);
    if (blocked) {
      setError(`${blocked} Review the report cards below, then ask the relevant teacher to complete or revalidate the results.`);
      return;
    }
    if (mode === PRINT_MODE.SELECTED && !selectedStudentId) {
      setError("Select a student before printing an individual report card.");
      return;
    }
    if (reports.length === 0) {
      setError("Generate the class report cards before printing.");
      return;
    }
    setError("");
    setPrintMode(mode);
  };

  return (
    <main className="p-6 max-w-5xl mx-auto print-area">
      <header className="mb-6 print-hidden">
        <h1 className="text-2xl font-bold">Official Report Cards</h1>
        <p className="mt-1 text-gray-600">Choose a class and term, check the reports, then print or save them as PDF.</p>
      </header>

      <section className="mb-6 rounded border bg-white p-4 print-hidden" aria-label="Report card selection">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="font-medium">
            Class
            <select value={classId} onChange={(event) => setClassId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2">
              <option value="">Select a class</option>
              {classes.map((schoolClass) => <option key={schoolClass.id} value={schoolClass.id}>{schoolClass.name}</option>)}
            </select>
          </label>
          <label className="font-medium">
            Reporting term
            <select value={termId} onChange={(event) => { setTermId(event.target.value); setReports([]); setSelectedStudentId(""); setError(""); }} disabled={!classId} className="mt-1 w-full rounded border px-3 py-2 disabled:bg-gray-100">
              <option value="">Select a term</option>
              {classTerms.map((term) => <option key={term.id} value={term.id}>{term.name} — {term.academicYear}</option>)}
            </select>
          </label>
        </div>

        <button type="button" onClick={loadReports} disabled={!classId || !termId || loading} className="mt-4 rounded bg-blue-700 px-4 py-2 text-white disabled:bg-gray-400">
          {loading ? "Loading report cards…" : "Generate Class Reports"}
        </button>

        {reports.length > 0 && (
          <div className="mt-5 border-t pt-4">
            <p className="mb-3 font-medium">{completeReportCount} of {reports.length} students have complete, printable reports.</p>
            <label className="block max-w-xl font-medium">
              Student for individual printing
              <select aria-label="Selected student" value={selectedStudentId} onChange={(event) => setSelectedStudentId(event.target.value)} className="mt-1 w-full rounded border px-3 py-2">
                <option value="">Select a student</option>
                {reports.map((report) => <option key={report.studentId} value={report.studentId}>{report.name}{report.admissionNo ? ` — ${report.admissionNo}` : ""}</option>)}
              </select>
            </label>
            <div className="mt-4 flex flex-wrap gap-3">
              <button type="button" onClick={() => beginPrint(PRINT_MODE.SELECTED)} disabled={!selectedStudentId || Boolean(printMode)} className="rounded bg-green-700 px-4 py-2 text-white disabled:bg-gray-400">Print / Save Selected as PDF</button>
              <button type="button" onClick={() => beginPrint(PRINT_MODE.ALL)} disabled={Boolean(printMode)} className="rounded bg-emerald-800 px-4 py-2 text-white disabled:bg-gray-400">Print / Save Entire Class as PDF</button>
              {selectedStudentId && <Link to={`/dashboard/admin/reports/${selectedStudentId}`} className="rounded border px-4 py-2">Open academic summary</Link>}
            </div>
          </div>
        )}
      </section>

      {error && <p role="alert" className="mb-5 rounded border border-red-300 bg-red-50 p-3 text-red-800 print-hidden">{error}</p>}
      {!loading && classId && termId && reports.length === 0 && !error && <p className="rounded border border-dashed p-4 text-gray-600 print-hidden">Select “Generate Class Reports” to preview every student.</p>}

      {renderedReports.map((student) => (
        <TeacherReportCardSheet
          key={student.studentId}
          student={student}
          className={selectedClass?.name || ""}
          termName={selectedTerm ? `${selectedTerm.name} — ${selectedTerm.academicYear}` : ""}
          termId={Number(termId)}
        />
      ))}
    </main>
  );
}
