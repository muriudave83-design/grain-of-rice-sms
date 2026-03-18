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

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [terms, setTerms] = useState([]);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  // 🔥 Load dropdown data
      useEffect(() => {
      async function loadDropdowns() {
        try {
          const [assignRes, termRes] = await Promise.all([
            API.get("/teacher/assignments"),
            API.get("/terms"),
          ]);

          const assignments = assignRes.data;

          const classes = assignments.map(a => a.class);
          const subjects = assignments.map(a => a.subject);

          setClasses(classes);
          setSubjects(subjects);
          setTerms(termRes.data);

        } catch (err) {
          console.error("❌ Failed to load dropdown data", err);
        } finally {
          setLoadingData(false);
        }
      }

      loadDropdowns();
    }, []);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]:
        e.target.type === "number"
          ? Number(e.target.value)
          : e.target.value,
    });
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
      console.error("❌ Create homework error:", err);
      alert("Error creating homework");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl">

      {/* Breadcrumb */}
      <div className="text-sm text-gray-600 mb-2">
        Teacher / Homework / Create
      </div>

      {/* Back Button */}
      <button
        onClick={() => navigate("/teacher/assessments")}
        className="mb-4 px-3 py-1 border rounded"
      >
        ← Back to Assessments
      </button>

      <h2 className="text-2xl font-semibold mb-4">
        Create Homework
      </h2>

      {loadingData ? (
        <p className="text-gray-500">Loading form data...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Title */}
          <input
            name="title"
            placeholder="Homework Title"
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          {/* Class Dropdown */}
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

          {/* Subject Dropdown */}
          <select
            name="subjectId"
            value={form.subjectId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select Subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Term Dropdown */}
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

          {/* Max Score */}
          <input
            name="maxScore"
            type="number"
            placeholder="Max Score"
            value={form.maxScore}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          {/* Weight */}
          <input
            name="weight"
            type="number"
            step="0.01"
            placeholder="Weight"
            value={form.weight}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />

          {/* Submit */}
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