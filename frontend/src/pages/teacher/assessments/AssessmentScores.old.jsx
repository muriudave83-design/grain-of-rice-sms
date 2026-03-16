import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function AssessmentScores() {
  const { assessmentId } = useParams();
  const navigate = useNavigate();

  const [assessment, setAssessment] = useState(null);
  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  // ===============================
  // LOAD DATA
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
  // UPDATE SCORE
  // ===============================
  function updateScore(studentId, value) {
    setScores((prev) => ({
      ...prev,
      [studentId]: value,
    }));
  }

  // ===============================
  // SAVE SCORES
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
  // STATES
  // ===============================
  if (loading) return <div className="p-6">Loading…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!assessment) return null;

  return (
    <div className="max-w-5xl mx-auto p-6">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-6">

        <div>
          <button
            onClick={() => navigate("/teacher/assessments")}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Assessments
          </button>

          <h1 className="text-2xl font-semibold mt-1">
            Scores — {assessment.title}
          </h1>

          <p className="text-sm text-gray-600">
            {assessment.subject?.name} • {assessment.subject?.class?.name} •
            Total Marks: {assessment.totalMarks}
          </p>
        </div>

        <button
          onClick={saveScores}
          disabled={saving}
          className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Scores"}
        </button>

      </div>

      {success && (
        <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
          Scores saved successfully.
        </div>
      )}

      {/* STUDENT COUNT */}
      <p className="text-sm text-gray-500 mb-3">
        {students.length} Students
      </p>

      {/* TABLE */}
      <div className="bg-white border rounded-lg overflow-hidden">

        <table className="w-full">

          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-3">Student</th>
              <th className="text-left p-3 w-40">
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
                <tr key={s.id} className="border-b last:border-none">

                  <td className="p-3 font-medium">
                    {s.name}
                  </td>

                  <td className="p-3">

                    <input
                      type="number"
                      min="0"
                      max={assessment.totalMarks}
                      value={value}
                      onChange={(e) =>
                        updateScore(s.id, e.target.value)
                      }
                      className={`w-24 border rounded px-2 py-1 focus:outline-none focus:ring ${
                        isInvalid
                          ? "border-red-500"
                          : "border-gray-300"
                      }`}
                    />

                  </td>

                </tr>
              );
            })}

          </tbody>
        </table>

      </div>

    </div>
  );
}