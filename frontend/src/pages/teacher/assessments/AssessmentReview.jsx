import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function AssessmentReview() {
  const { id: assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [scores, setScores] = useState([]);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReviewData();
  }, [assessmentId]);

  async function fetchReviewData() {
    try {
      const res = await api.get(`/assessments/${assessmentId}/scores`);

      const { assessment, students, scores } = res.data;

      // Build lookup map: studentId -> score
      const scoreMap = {};
      scores.forEach((s) => {
        scoreMap[s.studentId] = s.score;
      });

      // Normalize review rows
      const reviewRows = students.map((student) => ({
        studentId: student.id,
        studentName: `${student.firstName} ${student.lastName}`,
        marks: scoreMap[student.id] ?? null,
      }));

      setAssessment(assessment);
      setScores(reviewRows);
      setIsSubmitted(assessment.status === "SUBMITTED");
    } catch (err) {
      console.error("REVIEW LOAD ERROR:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to load assessment review data."
      );
    } finally {
      setLoading(false);
    }
  }

  async function submitFinal() {
    if (isSubmitted) return;

    const missing = scores.filter(
      (s) => s.marks === null || s.marks === undefined
    );

    if (missing.length > 0) {
      alert("Cannot submit. Some students are missing scores.");
      return;
    }

    if (
      !window.confirm(
        "This will submit and LOCK the assessment. Grades cannot be changed. Continue?"
      )
    ) {
      return;
    }

    setSubmitting(true);
    try {
      await api.patch(`/assessments/${assessmentId}/submit`);
      await fetchReviewData();
    } catch (err) {
      console.error("SUBMIT ERROR:", err);
      setError(
        err.response?.data?.message ||
          err.message ||
          "Failed to submit assessment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!assessment) return null;

  const missingCount = scores.filter(
    (s) => s.marks === null || s.marks === undefined
  ).length;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-2">
        Review Assessment Before Submission
      </h1>

      <p className="text-gray-600 mb-4">
        <strong>{assessment.title}</strong> · Total Marks {assessment.maxScore}
      </p>

      {missingCount > 0 && !isSubmitted && (
        <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
          ⚠️ {missingCount} student(s) have missing scores.
        </div>
      )}

      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Student</th>
            <th className="text-left py-2">Marks</th>
          </tr>
        </thead>
        <tbody>
          {scores.map((s) => {
            const missing =
              s.marks === null || s.marks === undefined;

            return (
              <tr key={s.studentId} className="border-b">
                <td className="py-2">{s.studentName}</td>
                <td className="py-2">
                  <span
                    className={
                      missing ? "text-red-600 font-semibold" : ""
                    }
                  >
                    {missing ? "MISSING" : s.marks}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {isSubmitted ? (
        <div className="bg-green-50 border border-green-200 p-4 rounded">
          <p className="font-semibold text-green-700">
            🔒 Scores submitted and locked
          </p>
          <p className="text-green-700 text-sm">
            These scores are final and cannot be changed.
          </p>
        </div>
      ) : (
        <>
          <div className="bg-red-50 border border-red-200 p-4 rounded mb-6">
            <p className="font-semibold text-red-700">⚠️ Important</p>
            <p className="text-red-700 text-sm">
              Once submitted, this assessment will be locked.
              Scores cannot be edited or deleted.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() =>
                navigate(
                  `/teacher/assessments/${assessmentId}/scores`
                )
              }
              className="border px-5 py-2 rounded"
            >
              Back to Scores
            </button>

            <button
              onClick={submitFinal}
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-2 rounded disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Confirm & Submit"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
