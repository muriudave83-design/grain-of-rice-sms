import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "@/services/apiClient";
import { formatGrade } from "@/utils/grading";

export default function ClassReportCards() {
  const { classId, term } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    let current = true;
    api.get(`/report-cards/teacher/${classId}/${term}`)
      .then(({ data }) => {
        if (!current) return;
        const subjects = [...new Set(data.flatMap((student) =>
          (student.subjects || []).map((subject) => subject.subject),
        ))];
        setReport({
          class: { id: classId, name: data[0]?.className || `Class ${classId}` },
          term,
          status: "draft",
          subjects,
          students: data.map((student) => ({
            id: student.studentId,
            name: student.student || student.name,
            subjects: student.subjects || [],
            total: student.summary?.total ?? null,
            average: student.summary?.average ?? null,
            grade: student.summary?.grade ?? null,
            isComplete: student.summary?.isComplete === true,
          })),
        });
      })
      .catch((requestError) => {
        if (!current) return;
        if (requestError.response?.status === 403) setError("You are not authorized to view this report.");
        else if (requestError.response?.status === 404) setError("No report data is available for this class and term.");
        else setError("Failed to load report card data.");
      })
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, [classId, term]);

  async function handlePublish() {
    if (!window.confirm("Publish complete report cards for this class and term?")) return;
    try {
      setPublishing(true);
      await api.post(`/report-cards/teacher/${classId}/${term}/publish`);
      setReport((previous) => ({ ...previous, status: "published" }));
    } catch (requestError) {
      alert(requestError.response?.data?.message || "Failed to publish report cards.");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) return <div className="p-6">Loading report cards...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!report?.students?.length) return <div className="p-6">No report data is available for this term.</div>;

  const canPublish = report.students.every((student) => student.isComplete);
  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Report Cards — {report.class.name}</h1>
          <p className="text-gray-600">Term: <strong>{report.term}</strong></p>
        </div>
        {report.status !== "published" && canPublish && (
          <button onClick={handlePublish} disabled={publishing} className="bg-green-600 text-white px-5 py-2 rounded disabled:opacity-50">
            {publishing ? "Publishing..." : "Publish Report Cards"}
          </button>
        )}
      </div>
      {!canPublish && <div className="mb-4 bg-amber-100 text-amber-900 p-3 rounded">Incomplete results must be resolved before publication.</div>}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead><tr className="border-b bg-gray-50"><th className="text-left p-2">Student</th>
            {report.subjects.map((subject) => <th key={subject} className="text-left p-2">{subject}</th>)}
            <th className="text-left p-2">Total</th><th className="text-left p-2">Average</th><th className="text-left p-2">Grade</th>
          </tr></thead>
          <tbody>{report.students.map((student) => <tr key={student.id} className="border-b">
            <td className="p-2 font-medium">{student.name}</td>
            {report.subjects.map((subjectName) => {
              const subject = student.subjects.find((entry) => entry.subject === subjectName);
              return <td key={subjectName} className="p-2">{subject?.average == null
                ? <span className="text-amber-700">Incomplete</span>
                : <><div>{Number(subject.average).toFixed(1)}%</div><div className="text-xs text-gray-500">{formatGrade(subject.grade)}</div></>}
              </td>;
            })}
            <td className="p-2 font-semibold">{student.total == null ? "Incomplete" : Number(student.total).toFixed(1)}</td>
            <td className="p-2">{student.average == null ? "Incomplete" : `${Number(student.average).toFixed(1)}%`}</td>
            <td className="p-2 font-bold">{student.isComplete ? formatGrade(student.grade) : "Incomplete"}</td>
          </tr>)}</tbody>
        </table>
      </div>
      <button onClick={() => navigate(-1)} className="mt-6 border px-5 py-2 rounded">Back</button>
    </div>
  );
}
