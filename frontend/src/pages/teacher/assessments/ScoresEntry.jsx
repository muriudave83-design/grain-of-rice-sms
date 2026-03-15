import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function ScoresEntry() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [students, setStudents] = useState([]);
  const [scores, setScores] = useState({});
  const [assessment, setAssessment] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // refs for ENTER navigation
  const inputRefs = useRef([]);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const res = await api.get(`/assessments/${id}/scores`);

      setAssessment(res.data.assessment);
      setStudents(res.data.students);

      const map = {};
      res.data.scores.forEach((s) => {
        map[s.studentId] = s.score;
      });

      setScores(map);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "You are not allowed to access this assessment."
      );
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const payload = students.map((s) => ({
      studentId: s.id,
      score: Number(scores[s.id] || 0),
    }));

    try {
      await api.post(`/assessments/${id}/scores`, {
        scores: payload,
      });

      alert("Scores saved");
    } catch (err) {
      alert("Failed to save scores");
    }
  }

  async function submit() {
    if (!window.confirm("Submit and lock? This cannot be edited.")) return;

    try {
      await api.post(`/assessments/${id}/submit`);
      alert("Assessment submitted");
      navigate("/teacher/assessments");
    } catch (err) {
      alert("Failed to submit");
    }
  }

  function handleEnter(e, index) {
    if (e.key === "Enter") {
      e.preventDefault();

      const next = inputRefs.current[index + 1];
      if (next) next.focus();
    }
  }

  if (loading) return <p>Loading...</p>;

  if (error) {
    return (
      <div className="p-6 text-red-700 bg-red-50">
        {error}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">

      <h1 className="text-xl font-bold mb-4">
        Scores — {assessment.title}
      </h1>

      <table className="w-full text-sm border">

        <thead>
          <tr className="bg-gray-50">
            <th className="p-2 text-left">Student</th>
            <th className="p-2 w-32">
              Score / {assessment.maxScore}
            </th>
          </tr>
        </thead>

        <tbody>
          {students.map((s, index) => (
            <tr key={s.id} className="border-t">

              <td className="p-2">
                {s.firstName} {s.lastName}
              </td>

              <td className="p-2">

                <input
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="number"
                  className="border p-1 w-full"
                  value={scores[s.id] ?? ""}
                  max={assessment.maxScore}

                  onKeyDown={(e) => handleEnter(e, index)}

                  onChange={(e) => {
                    let value = Number(e.target.value);

                    if (value < 0) value = 0;
                    if (value > assessment.maxScore) {
                      value = assessment.maxScore;
                    }

                    setScores({
                      ...scores,
                      [s.id]: value,
                    });
                  }}
                />

              </td>

            </tr>
          ))}
        </tbody>

      </table>

      <div className="mt-4 space-x-3">

        <button
          onClick={save}
          className="px-4 py-2 bg-blue-600 text-white"
        >
          Save
        </button>

        <button
          onClick={submit}
          className="px-4 py-2 bg-green-600 text-white"
        >
          Submit Assessment
        </button>

      </div>

    </div>
  );
}