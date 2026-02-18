import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/services/apiClient";

export default function CreateAssessment() {
  const navigate = useNavigate();

  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    title: "",
    classId: "",
    subjectId: "",
    categoryId: "",
    maxScore: "",
    termId: "",
    date: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ─────────────────────────────────────────────
  // LOAD CLASSES + CATEGORIES
  // ─────────────────────────────────────────────
  useEffect(() => {
    async function loadClasses() {
      try {
        setError(null);
        const res = await api.get("/classes/mine");
        setClasses(res.data);

        if (res.data.length === 0) {
          setError("You are not assigned to any classes.");
        }
      } catch (err) {
        setClasses([]);
        setError(
          err.response?.data?.message ||
            "Failed to load your classes."
        );
      }
    }

    async function fetchCategories() {
      try {
        const res = await api.get("/assignment-categories");
        setCategories(res.data);
      } catch (err) {
        console.error("Failed to load categories");
      }
    }

    loadClasses();
    fetchCategories();
  }, []);

  // ─────────────────────────────────────────────
  // LOAD SUBJECTS FOR SELECTED CLASS
  // ─────────────────────────────────────────────
  async function loadSubjects(classId) {
    if (!classId) {
      setSubjects([]);
      setForm((f) => ({ ...f, subjectId: "" }));
      return;
    }

    try {
      setError(null);

      const res = await api.get(
        "/assessments/teacher/subjects",
        { params: { classId } }
      );

      setSubjects(res.data);
      setForm((f) => ({ ...f, subjectId: "" }));

      if (res.data.length === 0) {
        setError("You are not assigned any subjects in this class.");
      }
    } catch (err) {
      setSubjects([]);
      setForm((f) => ({ ...f, subjectId: "" }));

      setError(
        err.response?.data?.message ||
          "No subjects assigned to you for this class."
      );
    }
  }

  useEffect(() => {
    if (form.classId) {
      loadSubjects(form.classId);
    }
  }, [form.classId]);

  // ─────────────────────────────────────────────
  // FORM HANDLERS
  // ─────────────────────────────────────────────
  function handleChange(e) {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await api.post("/assessments", {
        title: form.title,
        classId: Number(form.classId),
        subjectId: Number(form.subjectId),
        categoryId: Number(form.categoryId),
        termId: 2,
        maxScore: Number(form.maxScore),
        date: form.date || null,
        type: "EXAM",
      });

      navigate("/teacher/assessments");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "You are not allowed to create this assessment."
      );
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6">
        Create Assessment
      </h1>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* CLASS */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Class
          </label>

          <select
            name="classId"
            required
            value={form.classId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* SUBJECT */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Subject (Only your assigned subjects)
          </label>

          <select
            name="subjectId"
            required
            value={form.subjectId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            disabled={!form.classId || subjects.length === 0}
          >
            <option value="">Select subject</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {form.classId && subjects.length === 0 && (
            <p className="text-sm text-red-600 mt-1">
              No subjects assigned to you in this class.
            </p>
          )}
        </div>

        {/* CATEGORY */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Category
          </label>

          <select
            name="categoryId"
            required
            value={form.categoryId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* TITLE */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Assessment Title
          </label>

          <input
            name="title"
            required
            value={form.title}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g Mid Term CAT 1"
          />
        </div>

        {/* MAX SCORE */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Total Marks
          </label>

          <input
            type="number"
            name="maxScore"
            min="1"
            required
            value={form.maxScore}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g 100"
          />
        </div>

        {/* TERM */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Term
          </label>

          <input
            type="number"
            name="termId"
            min="1"
            required
            value={form.termId}
            onChange={handleChange}
            className="w-full border p-2 rounded"
            placeholder="e.g 1"
          />
        </div>

        {/* DATE */}
        <div>
          <label className="block text-sm mb-1 font-medium">
            Date (optional)
          </label>

          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            className="w-full border p-2 rounded"
          />
        </div>

        <button
          disabled={
            loading ||
            !form.subjectId ||
            !form.categoryId
          }
          className="bg-blue-600 text-white px-6 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Assessment"}
        </button>
      </form>
    </div>
  );
}
