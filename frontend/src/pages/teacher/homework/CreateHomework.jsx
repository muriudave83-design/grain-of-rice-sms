import { useState, useEffect } from "react";
import API from "../../../api/apiClient";
import { useNavigate } from "react-router-dom";

export default function CreateHomework() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: "",
    classId: "",
    subjectId: "",
    termId: "",
    maxScore: 10,
    weight: 0.1,
  });

  const [assignments, setAssignments] = useState([]);
  const [terms, setTerms] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // Load dropdown data
  useEffect(() => {
    async function loadDropdowns() {
      try {
        const [assignRes, termRes] = await Promise.all([
          API.get("/teacher/assignments"),
          API.get("/terms"),
        ]);

        setAssignments(assignRes.data);
        setTerms(termRes.data);
      } catch (err) {
        console.error("Failed to load dropdown data", err);
      } finally {
        setLoadingData(false);
      }
    }

    loadDropdowns();
  }, []);

  // Unique classes derived from assignments
  const classes = [
    ...new Map(assignments.map((a) => [a.class.id, a.class])).values(),
  ];

  // Subjects filtered by selected class
  const subjects = assignments
    .filter((a) => a.class.id == form.classId)
    .map((a) => a.subject);

  const handleChange = (e) => {
    const { name, value, type } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
      ...(name === "classId" && { subjectId: "" }),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title || !form.classId || !form.subjectId || !form.termId) {
      alert("Please fill all required fields");
      return;
    }

    try {
      setLoading(true);

      await API.post("/assessments", {
        ...form,
        categoryId: 1,
        type: "HOMEWORK",
      });

      alert("Homework created successfully");
      navigate("/teacher/assessments");
    } catch (err) {
      console.error("Create homework error:", err);
      alert("Error creating homework");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">
      <div className="text-sm text-gray-600 mb-2">
        Teacher / Homework / Create
      </div>

      <button
        onClick={() => navigate("/teacher/assessments")}
        className="mb-4 px-3 py-1 border rounded"
      >
        ← Back to Assessments
      </button>

      <h2 className="text-2xl font-semibold mb-4">Create Homework</h2>

      {loadingData ? (
        <p className="text-gray-500">Loading form data...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="title"
            placeholder="Homework Title"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <select
            name="classId"
            value={form.classId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            name="subjectId"
            value={form.subjectId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            disabled={!form.classId}
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            name="termId"
            value={form.termId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Term</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          <input
            name="maxScore"
            type="number"
            placeholder="Max Score"
            value={form.maxScore}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <input
            name="weight"
            type="number"
            step="0.01"
            placeholder="Weight"
            value={form.weight}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded w-full"
          >
            {loading ? "Creating..." : "Create Homework"}
          </button>
        </form>
      )}
    </div>
  );
}