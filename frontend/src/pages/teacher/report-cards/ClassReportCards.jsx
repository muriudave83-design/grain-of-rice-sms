import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

// ✅ STEP 1 — Grade function
function getGrade(avg) {
  if (avg >= 80) return "A";
  if (avg >= 70) return "B";
  if (avg >= 60) return "C";
  if (avg >= 50) return "D";
  return "E";
}

export default function ClassReportCards() {
  const { classId, term } = useParams();
  const navigate = useNavigate();

  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [publishing, setPublishing] = useState(false);

useEffect(() => {
  async function fetchReport() {
    try {
      console.log("🔥 FETCHING REPORT...", classId, term);

      const url = `/report-cards/teacher/${classId}/${term}`;
      console.log("📡 REQUEST URL:", url);

      const res = await api.get(url);

      console.log("✅ RESPONSE STATUS:", res.status);
      console.log("📦 RAW RESPONSE DATA:", res.data);

      // ✅ TRANSFORM BACKEND RESPONSE → MATCH YOUR UI
      const data = res.data;

      const subjectsSet = new Set();

      data.forEach((student) => {
        console.log("👤 STUDENT FROM API:", student);

        if (student.subjects) {
          student.subjects.forEach((s) => {
            subjectsSet.add(s.subject);
          });
        }
      });

      const transformed = {
        class: { name: `Class ${classId}` },
        term,
        status: "draft",
        subjects: Array.from(subjectsSet),
        students: data.map((student) => {
          console.log("🔄 TRANSFORMING STUDENT:", student);

          return {
            id: student.studentId,
            name: student.student || student.name,
            subjects: (student.subjects || []).map((s) => ({
              subject: s.subject,
              score: s.average,
              average: s.average,
              grade: getGrade(s.average),
            })),
            total: student.total || student.overallAverage || 0,
            average: student.average || student.overallAverage || 0,
          };
        }),
      };

      console.log("🧠 FINAL TRANSFORMED DATA:", transformed);

      setReport(transformed);

    } catch (err) {
      console.error("❌ FETCH ERROR:", err);

      if (err.response) {
        console.error("❌ ERROR RESPONSE:", err.response.data);
        console.error("❌ STATUS:", err.response.status);
      }

      if (err.response?.status === 404) {
        setError("No submitted assessments found for this class and term.");
      } else if (err.response?.status === 403) {
        setError("You are not authorized to view this report.");
      } else {
        setError("Failed to load report card data.");
      }
    } finally {
      setLoading(false);
    }
  }

  fetchReport();
}, [classId, term]);

  async function handlePublish() {
    const confirmed = window.confirm(
      "Publish report cards for this class and term?\n\nThis action is final and cannot be undone."
    );

    if (!confirmed) return;

    try {
      setPublishing(true);
      await api.post(
        `/report-cards/teacher/${classId}/${term}/publish`
      );

      setReport((prev) => ({
        ...prev,
        status: "published",
      }));
    } catch (err) {
      alert("Failed to publish report cards.");
    } finally {
      setPublishing(false);
    }
  }

  if (loading) {
    return <div className="p-6">Loading report cards…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!report || report.students?.length === 0) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-2">
          Report Cards — {report?.class?.name}
        </h1>
        <p className="text-gray-600">
          No submitted assessment data available for this term.
        </p>
      </div>
    );
  }

  const isPublished = report.status === "published";

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">
            Report Cards — {report.class.name}
          </h1>
          <p className="text-gray-600">
            Term: <strong>{report.term}</strong> • Computed from submitted scores
          </p>
        </div>

        {!isPublished && (
          <button
            onClick={handlePublish}
            disabled={publishing}
            className="bg-green-600 text-white px-5 py-2 rounded disabled:opacity-50"
          >
            {publishing ? "Publishing…" : "Publish Report Cards"}
          </button>
        )}
      </div>

      {isPublished && (
        <div className="mb-4 bg-green-100 text-green-800 p-3 rounded text-sm">
          These report cards have been published and are now visible to parents
          and students.
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="text-left py-2 px-2">Student</th>

              {report.subjects.map((s) => (
                <th key={s} className="text-left py-2 px-2">
                  {s}
                </th>
              ))}

              <th className="text-left py-2 px-2">Total</th>
              <th className="text-left py-2 px-2">Average</th>
              <th className="text-left py-2 px-2">Grade</th>
            </tr>
          </thead>

          <tbody>
            {report.students.map((student) => (
              <tr key={student.id} className="border-b">
                <td className="py-2 px-2 font-medium">
                  {student.name}
                </td>

                {report.subjects.map((subject) => {
                  const subj = student.subjects.find(
                    (s) => s.subject === subject
                  );

                  return (
                    <td key={subject} className="py-2 px-2">
                      {subj ? (
                        <div>
                          <div>{subj.average?.toFixed(1)}%</div>
                          <div className="text-xs text-gray-500">
                            {subj.grade}
                          </div>
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                  );
                })}

                <td className="py-2 px-2 font-semibold">
                  {student.total}
                </td>

                <td className="py-2 px-2">
                  {student.average}
                </td>

                <td className="py-2 px-2 font-bold">
                  {getGrade(student.average)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-6">
        <button
          onClick={() => navigate(-1)}
          className="border px-5 py-2 rounded"
        >
          Back
        </button>
      </div>
    </div>
  );
}