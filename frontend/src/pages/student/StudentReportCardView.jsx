import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/apiClient";
import { formatGrade } from "../../utils/grading";

const statusText = (subject) => {
  if (subject.completenessState === "REVIEW_REQUIRED") return "Review required";
  if (subject.average === null || subject.average === undefined) return "Incomplete";
  return `${Number(subject.average).toFixed(1)}%`;
};

export default function StudentReportCardView() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [studentData, setStudentData] = useState(null);
  const [termId, setTermId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    api.get(`/reports/student/${studentId}`, {
      params: termId ? { termId } : {},
      signal: controller.signal,
    }).then(({ data }) => setStudentData(data))
      .catch((requestError) => {
        if (requestError.code !== "ERR_CANCELED") setError(requestError?.response?.data?.message || "Failed to load report card");
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [studentId, termId]);

  if (loading && !studentData) return <div className="p-6">Loading…</div>;
  if (error && !studentData) return <div className="p-6 text-red-700">{error}</div>;

  const summary = studentData?.summary;
  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 rounded bg-slate-700 px-3 py-2">Back</button>
      <h1 className="text-2xl font-bold">Report Card — {studentData?.student}</h1>
      <p className="mt-1 text-slate-300">Class: {studentData?.class}</p>

      <label className="mt-5 block max-w-sm text-sm font-medium">
        Reporting term
        <select className="mt-1 w-full rounded border border-slate-600 bg-slate-900 p-2" value={termId} onChange={(event) => setTermId(event.target.value)}>
          <option value="">Select a term</option>
          {(studentData?.terms || []).map((term) => (
            <option key={term.id} value={term.id}>{term.name} — {term.academicYear}</option>
          ))}
        </select>
      </label>

      {error && <p className="mt-4 rounded bg-red-950 p-3 text-red-200">{error}</p>}
      {!termId ? (
        <p className="mt-6 rounded border border-slate-700 p-4">Select the exact term to calculate this report. Scores from different terms are never mixed.</p>
      ) : (
        <>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead><tr className="border-b border-slate-600"><th className="p-3 text-left">Subject</th><th className="p-3 text-left">Result</th><th className="p-3 text-left">Grade</th><th className="p-3 text-left">Configuration</th></tr></thead>
              <tbody>
                {(studentData?.subjects || []).map((subject) => (
                  <tr key={subject.subjectId} className="border-b border-slate-800">
                    <td className="p-3">{subject.subject}</td>
                    <td className="p-3">{statusText(subject)}</td>
                    <td className="p-3">{subject.grade ? formatGrade(subject.grade) : "—"}</td>
                    <td className="p-3 text-sm text-amber-200">
                      {subject.configurationWarnings?.includes("NO_TERM_ASSIGNMENTS") && "No assignments for this term — confirm that this is an official subject."}
                      {subject.configurationWarnings?.includes("MULTIPLE_ACTIVE_TEACHER_ASSIGNMENTS") && " Multiple active teacher assignments — review ownership."}
                      {subject.configurationWarnings?.includes("PUBLISHED_GRADE_NEEDS_REVALIDATION") && " Published grade preserved — contribution changes require administrator revalidation."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <section className="mt-6 rounded border border-slate-700 p-4">
            <p><strong>Overall average:</strong> {summary?.isComplete ? `${summary.average.toFixed(1)}%` : "Incomplete"}</p>
            <p><strong>Overall grade:</strong> {summary?.grade ? formatGrade(summary.grade) : "—"}</p>
          </section>
        </>
      )}
    </main>
  );
}
