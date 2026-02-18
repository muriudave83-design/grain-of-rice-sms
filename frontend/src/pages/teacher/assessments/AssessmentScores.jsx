import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/apiClient";

export default function AssessmentScores() {
  const { assessmentId } = useParams();

  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ===============================
  // LOAD ASSESSMENT + STUDENTS + SCORES
  // ===============================
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const res = await api.get(`/assessments/${assessmentId}/scores`);

        const { assessment, students, scores: existingScores } = res.data;

        setAssessment(assessment);
        setStudents(students);

        // Map existing scores into controlled state
        const initialScores = {};
        students.forEach((s) => {
          const found = existingScores?.find(
            (es) => es.studentId === s.id
          );
          initialScores[s.id] = found ? found.marks : "";
        });

        setScores(initialScores);
      } catch (err) {
        console.error(err);
        setError("Failed to load assessment scores.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [assessmentId]);

  // ===============================
  // UPDATE SCORE (CONTROLLED)
  // ===============================
  function updateScore(studentId, value) {
    setScores((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  }

  // ===============================
  // SAVE SCORES (BULK, IDEMPOTENT)
  // ===============================
  async function saveScores() {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const payload = Object.entries(scores)
        .filter(([, marks]) => marks !== "" && marks !== null)
        .map(([studentId, marks]) => ({
          studentId: Number(studentId),
          marks: Number(marks),
        }));

      await api.post(`/assessments/${assessmentId}/scores`, {
        scores: payload,
      });

      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to save scores.");
    } finally {
      setSaving(false);
    }
  }

  // ===============================
  // RENDER STATES
  // ===============================
  if (loading) {
    return <div className="p-6">Loading…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  if (!assessment) return null;

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* ===============================
          CONTEXT HEADER
         =============================== */}
      <h1 className="text-2xl font-semibold mb-1">
        {assessment.title}
      </h1>

      <p className="text-sm text-gray-600 mb-4">
        Subject: {assessment.subject?.name} • Class:{" "}
        {assessment.subject?.class?.name} • Total Marks:{" "}
        {assessment.totalMarks}
      </p>

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          Scores saved successfully.
        </div>
      )}

      {/* ===============================
          SCORES TABLE
         =============================== */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2">Student</th>
            <th className="text-left py-2 w-32">
              Score / {assessment.totalMarks}
            </th>
          </tr>
        </thead>
        <tbody>
          {students.map((s) => {
            const value = scores[s.id];
            const isInvalid =
              value !== "" &&
              (Number(value) < 0 ||
                Number(value) > assessment.totalMarks);

            return (
              <tr key={s.id} className="border-b">
                <td className="py-2">{s.name}</td>
                <td className="py-2">
                  <input
                    type="number"
                    min="0"
                    max={assessment.totalMarks}
                    value={value}
                    onChange={(e) =>
                      updateScore(s.id, e.target.value)
                    }
                    className={`w-24 border rounded px-2 py-1 ${
                      isInvalid ? "border-red-500" : ""
                    }`}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* ===============================
          ACTIONS
         =============================== */}
      <div className="mt-6">
        <button
          onClick={saveScores}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Scores"}
        </button>
      </div>
    </div>
  );
}
